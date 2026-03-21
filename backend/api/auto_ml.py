"""
Auto-ML API
One-click training, registry, and inference for tabular datasets.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
import sqlite3

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.svm import SVC, SVR

try:  # optional xgboost
    from xgboost import XGBClassifier, XGBRegressor  # type: ignore
    XGBOOST_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    XGBOOST_AVAILABLE = False
    XGBClassifier = None  # type: ignore
    XGBRegressor = None  # type: ignore

router = APIRouter(prefix="/api/auto-ml", tags=["AutoML"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = PROJECT_ROOT / "data" / "models"
DB_PATH = Path(__file__).resolve().parents[2] / "databotics.db"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS ml_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            task_type TEXT NOT NULL,
            algorithm TEXT NOT NULL,
            accuracy REAL,
            feature_count INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            model_path TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def _read_dataset(file: Optional[UploadFile], sql_query: Optional[str]) -> pd.DataFrame:
    if file is None and not sql_query:
        raise HTTPException(status_code=400, detail="Provide a CSV upload or SQL query")

    if file is not None:
        raw = file.file.read()
        filename = file.filename or "dataset.csv"
        if filename.endswith((".xlsx", ".xls")):
            return pd.read_excel(BytesIO(raw))
        return pd.read_csv(BytesIO(raw))

    conn = sqlite3.connect(DB_PATH)
    try:
        return pd.read_sql_query(sql_query, conn)
    finally:
        conn.close()


def _infer_target_column(df: pd.DataFrame, target_col: Optional[str]) -> str:
    if target_col:
        if target_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_col}' not in dataset")
        return target_col

    candidates = ["target", "label", "y", "outcome", "class"]
    for c in df.columns:
        if c.lower() in candidates:
            return c

    return df.columns[-1]


def _infer_task_type(y: pd.Series) -> str:
    if y.dtype == "bool" or y.dtype == "object" or str(y.dtype).startswith("category"):
        return "classification"

    unique_count = y.nunique(dropna=True)
    if unique_count <= 20:
        return "classification"

    if unique_count / max(len(y), 1) <= 0.05:
        return "classification"

    return "regression"


def _build_preprocessor(df: pd.DataFrame, target_col: str) -> Tuple[ColumnTransformer, List[str]]:
    feature_cols = [c for c in df.columns if c != target_col]
    numeric_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in feature_cols if c not in numeric_cols]

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            ),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_cols),
            ("cat", categorical_pipeline, categorical_cols),
        ],
        remainder="drop",
    )

    return preprocessor, feature_cols


def _candidate_models(task_type: str) -> List[Tuple[str, Any]]:
    if task_type == "classification":
        models: List[Tuple[str, Any]] = [
            ("Logistic Regression", LogisticRegression(max_iter=1500, class_weight="balanced")),
            ("Random Forest", RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42)),
            ("SVM", SVC(probability=True, class_weight="balanced")),
        ]
        if XGBOOST_AVAILABLE:
            models.append(("XGBoost", XGBClassifier(eval_metric="logloss", use_label_encoder=False)))
        else:
            models.append(("Gradient Boosting", GradientBoostingClassifier()))
        return models

    models = [
        ("Linear Regression", LinearRegression()),
        ("Random Forest", RandomForestRegressor(n_estimators=300, random_state=42)),
        ("SVR", SVR()),
    ]
    if XGBOOST_AVAILABLE:
        models.append(("XGBoost", XGBRegressor()))
    else:
        models.append(("Gradient Boosting", GradientBoostingRegressor()))
    return models


def _evaluate_candidates(
    X: pd.DataFrame,
    y: pd.Series,
    preprocessor: ColumnTransformer,
    task_type: str,
) -> Tuple[str, Pipeline, float]:
    best_score = -np.inf
    best_model: Optional[Pipeline] = None
    best_name = ""

    if task_type == "classification":
        cv = StratifiedKFold(n_splits=min(5, max(2, len(y) // 5)), shuffle=True, random_state=42)
        scoring = "accuracy"
    else:
        cv = KFold(n_splits=min(5, max(2, len(y) // 5)), shuffle=True, random_state=42)
        scoring = "r2"

    for name, estimator in _candidate_models(task_type):
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("model", estimator),
            ]
        )
        try:
            scores = cross_val_score(pipeline, X, y, cv=cv, scoring=scoring)
            score = float(np.nanmean(scores))
        except Exception:
            continue
        if score > best_score:
            best_score = score
            best_model = pipeline
            best_name = name

    if best_model is None:
        raise HTTPException(status_code=500, detail="Failed to train any candidate models")

    best_model.fit(X, y)
    return best_name, best_model, best_score


def _get_feature_names(preprocessor: ColumnTransformer, input_features: List[str]) -> List[str]:
    if hasattr(preprocessor, "get_feature_names_out"):
        return list(preprocessor.get_feature_names_out())
    return input_features


def _extract_feature_importance(model: Pipeline, feature_names: List[str]) -> List[Dict[str, Any]]:
    estimator = model.named_steps.get("model")
    if estimator is None:
        return []

    importance: Optional[np.ndarray] = None
    if hasattr(estimator, "feature_importances_"):
        importance = getattr(estimator, "feature_importances_")
    elif hasattr(estimator, "coef_"):
        coef = getattr(estimator, "coef_")
        importance = np.abs(coef).ravel()

    if importance is None:
        return []

    entries = [
        {"feature": name, "importance": float(val)}
        for name, val in zip(feature_names, importance)
    ]
    entries.sort(key=lambda x: x["importance"], reverse=True)
    return entries


def _save_model_package(model_id: str, package: Dict[str, Any]) -> Path:
    model_path = MODEL_DIR / f"{model_id}.joblib"
    joblib.dump(package, model_path)
    return model_path


def _load_model_package(model_id: str) -> Dict[str, Any]:
    model_path = MODEL_DIR / f"{model_id}.joblib"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    return joblib.load(model_path)


def _insert_model_record(
    model_id: str,
    name: str,
    task_type: str,
    algorithm: str,
    accuracy: float,
    feature_count: int,
    model_path: str,
) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ml_models (id, name, task_type, algorithm, accuracy, feature_count, created_at, model_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            model_id,
            name,
            task_type,
            algorithm,
            accuracy,
            feature_count,
            datetime.utcnow().isoformat(),
            model_path,
        ),
    )
    conn.commit()
    conn.close()


@router.post("/train")
async def train_model(
    file: Optional[UploadFile] = File(None),
    sql_query: Optional[str] = Form(None),
    target_col: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
):
    """Train an Auto-ML model on a dataset (CSV upload or SQL query)."""
    init_db()
    df = _read_dataset(file, sql_query)
    if df.empty:
        raise HTTPException(status_code=400, detail="Dataset is empty")

    target = _infer_target_column(df, target_col)
    y = df[target]
    X = df.drop(columns=[target])

    task_type = _infer_task_type(y)
    preprocessor, input_features = _build_preprocessor(df, target)

    algorithm, pipeline, score = _evaluate_candidates(X, y, preprocessor, task_type)

    feature_names = _get_feature_names(pipeline.named_steps["preprocessor"], input_features)
    model_id = str(uuid4())
    model_name = name or f"AutoML {algorithm}"

    package = {
        "model": pipeline,
        "task_type": task_type,
        "algorithm": algorithm,
        "target_col": target,
        "feature_names": feature_names,
        "accuracy": score,
        "dataset_size": int(len(df)),
        "trained_at": datetime.utcnow().isoformat(),
    }

    model_path = _save_model_package(model_id, package)
    _insert_model_record(
        model_id=model_id,
        name=model_name,
        task_type=task_type,
        algorithm=algorithm,
        accuracy=float(score),
        feature_count=len(feature_names),
        model_path=str(model_path),
    )

    return {
        "id": model_id,
        "name": model_name,
        "task_type": task_type,
        "algorithm": algorithm,
        "accuracy": float(score),
        "feature_count": len(feature_names),
        "dataset_size": len(df),
        "created_at": package["trained_at"],
    }


@router.get("/models")
def list_models():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, task_type, algorithm, accuracy, feature_count, created_at, model_path FROM ml_models ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        model_id, name, task_type, algorithm, accuracy, feature_count, created_at, model_path = row
        dataset_size = None
        try:
            pkg = _load_model_package(model_id)
            dataset_size = pkg.get("dataset_size")
        except Exception:
            dataset_size = None

        results.append(
            {
                "id": model_id,
                "name": name,
                "task_type": task_type,
                "algorithm": algorithm,
                "accuracy": accuracy,
                "feature_count": feature_count,
                "created_at": created_at,
                "dataset_size": dataset_size,
            }
        )

    return {"models": results}


@router.get("/models/{model_id}")
def get_model(model_id: str):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, task_type, algorithm, accuracy, feature_count, created_at, model_path FROM ml_models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Model not found")

    model_id, name, task_type, algorithm, accuracy, feature_count, created_at, _ = row
    pkg = _load_model_package(model_id)

    return {
        "id": model_id,
        "name": name,
        "task_type": task_type,
        "algorithm": algorithm,
        "accuracy": accuracy,
        "feature_count": feature_count,
        "created_at": created_at,
        "target_col": pkg.get("target_col"),
        "feature_names": pkg.get("feature_names", []),
        "dataset_size": pkg.get("dataset_size"),
    }


@router.post("/models/{model_id}/predict")
def predict(model_id: str, payload: Dict[str, Any] = Body(...)):
    pkg = _load_model_package(model_id)
    model: Pipeline = pkg["model"]
    feature_names = pkg.get("feature_names", [])
    task_type = pkg.get("task_type")

    inputs = payload.get("features") or payload.get("input") or payload.get("inputs")
    if inputs is None:
        raise HTTPException(status_code=400, detail="Missing 'features' in request body")

    if isinstance(inputs, dict):
        rows = [inputs]
    elif isinstance(inputs, list):
        rows = inputs
    else:
        raise HTTPException(status_code=400, detail="Invalid features payload")

    frame = pd.DataFrame(rows)
    for col in frame.columns:
        frame[col] = pd.to_numeric(frame[col], errors="ignore")
    if feature_names:
        missing = [c for c in feature_names if c not in frame.columns]
        for col in missing:
            frame[col] = np.nan
        frame = frame[feature_names]

    preds = model.predict(frame)
    result: Dict[str, Any] = {"predictions": preds.tolist()}

    if task_type == "classification" and hasattr(model.named_steps["model"], "predict_proba"):
        probs = model.predict_proba(frame)
        confidences = probs.max(axis=1).tolist()
        result["confidence"] = confidences
    else:
        result["confidence"] = None

    return result


@router.delete("/models/{model_id}")
def delete_model(model_id: str):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT model_path FROM ml_models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found")

    model_path = row[0]
    cursor.execute("DELETE FROM ml_models WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()

    if model_path and Path(model_path).exists():
        Path(model_path).unlink(missing_ok=True)

    return {"ok": True}


@router.get("/models/{model_id}/feature-importance")
def feature_importance(model_id: str, top_n: int = 12):
    pkg = _load_model_package(model_id)
    model: Pipeline = pkg["model"]
    feature_names = pkg.get("feature_names", [])

    importance = _extract_feature_importance(model, feature_names)
    if top_n:
        importance = importance[:top_n]

    return {"features": importance}


@router.post("/models/{model_id}/evaluate")
async def evaluate_model(
    model_id: str,
    file: Optional[UploadFile] = File(None),
    sql_query: Optional[str] = Form(None),
    target_col: Optional[str] = Form(None),
):
    pkg = _load_model_package(model_id)
    model: Pipeline = pkg["model"]
    task_type = pkg.get("task_type")
    target = target_col or pkg.get("target_col")

    df = _read_dataset(file, sql_query)
    if target is None or target not in df.columns:
        raise HTTPException(status_code=400, detail="Target column missing for evaluation")

    y_true = df[target]
    X = df.drop(columns=[target])

    preds = model.predict(X)

    if task_type == "classification":
        metrics = {
            "accuracy": float(accuracy_score(y_true, preds)),
            "precision": float(precision_score(y_true, preds, average="weighted", zero_division=0)),
            "recall": float(recall_score(y_true, preds, average="weighted", zero_division=0)),
            "f1": float(f1_score(y_true, preds, average="weighted", zero_division=0)),
        }
        labels = sorted(set(y_true))
        cm = confusion_matrix(y_true, preds, labels=labels)
        return {
            "task_type": task_type,
            "metrics": metrics,
            "confusion_matrix": {
                "labels": [str(l) for l in labels],
                "matrix": cm.tolist(),
            },
            "sample_predictions": [
                {"actual": str(a), "predicted": str(p)}
                for a, p in list(zip(y_true, preds))[:10]
            ],
        }

    metrics = {
        "r2": float(r2_score(y_true, preds)),
        "mae": float(mean_absolute_error(y_true, preds)),
        "mse": float(mean_squared_error(y_true, preds)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, preds))),
    }

    return {
        "task_type": task_type,
        "metrics": metrics,
        "sample_predictions": [
            {"actual": float(a), "predicted": float(p)}
            for a, p in list(zip(y_true, preds))[:10]
        ],
    }


init_db()
