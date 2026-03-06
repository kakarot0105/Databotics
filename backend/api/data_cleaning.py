from __future__ import annotations

import io
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/cleaning", tags=["data-cleaning"])


# In-memory cleaning sessions
CLEANING_SESSIONS: Dict[str, Dict[str, Any]] = {}


EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^\+?[0-9()\-\s]{7,}$")
URL_RE = re.compile(r"^https?://", re.IGNORECASE)


class FixRequest(BaseModel):
    session_id: str
    fix_type: str
    column: Optional[str] = None
    method: Optional[str] = None
    value: Optional[Any] = None
    outlier_method: Optional[str] = None
    action: Optional[str] = None
    target_type: Optional[str] = None


class AnalyzeResponse(BaseModel):
    session_id: str
    row_count: int
    column_count: int
    columns: List[Dict[str, Any]]
    issues: List[Dict[str, Any]]
    summary: Dict[str, Any]
    preview_rows: List[Dict[str, Any]]
    preview_columns: List[str]
    cell_issues: Dict[str, Dict[str, List[str]]]
    quality_score: float


def _read_table_from_upload(file_bytes: Optional[bytes], text_data: Optional[str]) -> pd.DataFrame:
    if file_bytes is None and not text_data:
        raise HTTPException(status_code=400, detail="Provide a file or pasted CSV data.")

    if file_bytes is not None:
        try:
            return pd.read_csv(io.BytesIO(file_bytes))
        except Exception:
            try:
                return pd.read_excel(io.BytesIO(file_bytes))
            except Exception as exc:
                raise HTTPException(status_code=400, detail=str(exc))

    try:
        return pd.read_csv(io.StringIO(text_data or ""))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


def _infer_column_type(series: pd.Series) -> str:
    non_null = series.dropna()
    if non_null.empty:
        return "unknown"

    if pd.api.types.is_numeric_dtype(non_null):
        return "numeric"

    # Try datetime detection
    parsed = pd.to_datetime(non_null, errors="coerce")
    if parsed.notna().mean() >= 0.8:
        return "date"

    # Regex-based detection
    text_vals = non_null.astype(str)
    email_ratio = text_vals.apply(lambda v: bool(EMAIL_RE.match(v.strip()))).mean()
    if email_ratio >= 0.8:
        return "email"

    phone_ratio = text_vals.apply(lambda v: bool(PHONE_RE.match(v.strip()))).mean()
    if phone_ratio >= 0.8:
        return "phone"

    url_ratio = text_vals.apply(lambda v: bool(URL_RE.match(v.strip()))).mean()
    if url_ratio >= 0.6:
        return "url"

    unique_ratio = non_null.nunique() / max(1, len(non_null))
    if unique_ratio <= 0.1 or non_null.nunique() <= 25:
        return "categorical"

    return "text"


def _normalize_value(value: Any) -> Any:
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return value


def _preview_rows(df: pd.DataFrame, limit: int = 100) -> List[Dict[str, Any]]:
    return [
        {k: _normalize_value(v) for k, v in row.items()}
        for row in df.head(limit).to_dict(orient="records")
    ]


def _compute_quality_score(summary: Dict[str, Any]) -> float:
    missing_pct = summary.get("missing_pct", 0.0)
    duplicate_pct = summary.get("duplicate_pct", 0.0)
    outlier_pct = summary.get("outlier_pct", 0.0)
    format_issue_pct = summary.get("format_issue_pct", 0.0)

    penalty = (
        missing_pct * 60
        + duplicate_pct * 20
        + outlier_pct * 15
        + format_issue_pct * 10
    )
    score = max(0.0, 100.0 - penalty)
    return round(score, 1)


def _add_issue(
    issues: List[Dict[str, Any]],
    issue_type: str,
    severity: str,
    columns: List[str],
    row_indices: List[int],
    message: str,
    suggested_fix: Optional[Dict[str, Any]] = None,
    preview: Optional[Dict[str, Any]] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    issues.append(
        {
            "id": uuid.uuid4().hex,
            "type": issue_type,
            "severity": severity,
            "columns": columns,
            "row_count": len(row_indices),
            "row_indices": row_indices,
            "message": message,
            "suggested_fix": suggested_fix or {},
            "preview": preview or {},
            "details": details or {},
        }
    )


def _generate_analysis(df: pd.DataFrame) -> AnalyzeResponse:
    df = df.reset_index(drop=True)
    columns_info: List[Dict[str, Any]] = []
    issues: List[Dict[str, Any]] = []
    cell_issues: Dict[str, Dict[str, List[str]]] = {}
    row_count = len(df)
    column_count = len(df.columns)

    inferred_types: Dict[str, str] = {}
    for col in df.columns:
        inferred_types[col] = _infer_column_type(df[col])

    # Missing values
    total_missing = 0
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        null_pct = null_count / max(1, row_count)
        total_missing += null_count
        stats = None
        if inferred_types[col] == "numeric":
            series = pd.to_numeric(df[col], errors="coerce")
            stats = {
                "min": float(series.min()) if series.notna().any() else None,
                "max": float(series.max()) if series.notna().any() else None,
                "mean": float(series.mean()) if series.notna().any() else None,
                "median": float(series.median()) if series.notna().any() else None,
                "mode": _normalize_value(series.mode().iloc[0]) if series.notna().any() and not series.mode().empty else None,
                "std": float(series.std()) if series.notna().any() else None,
            }
        columns_info.append(
            {
                "name": col,
                "type": inferred_types[col],
                "missing_count": null_count,
                "missing_pct": round(null_pct * 100, 2),
                "stats": stats,
            }
        )
        if null_count > 0:
            severity = "high" if null_pct >= 0.2 else "medium" if null_pct >= 0.05 else "low"
            row_indices = df[df[col].isna()].index.tolist()
            suggested_method = "median" if inferred_types[col] == "numeric" else "mode"
            _add_issue(
                issues,
                "missing",
                severity,
                [col],
                row_indices,
                f"{null_count} missing values in {col}",
                suggested_fix={"fix_type": "fill_missing", "column": col, "method": suggested_method},
            )
            for idx in row_indices:
                if idx < 100:
                    cell_issues.setdefault(str(idx), {}).setdefault(col, []).append("missing")

    # Outliers (IQR + Z-score)
    total_outliers = 0
    for col in df.columns:
        if inferred_types[col] != "numeric":
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        numeric = series.dropna()
        if numeric.empty:
            continue
        q1 = numeric.quantile(0.25)
        q3 = numeric.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        iqr_mask = (series < lower) | (series > upper) if iqr != 0 else pd.Series(False, index=series.index)

        mean = numeric.mean()
        std = numeric.std()
        if std and std != 0:
            zscores = (series - mean) / std
            z_mask = zscores.abs() > 3
        else:
            z_mask = pd.Series(False, index=series.index)

        combined_mask = iqr_mask | z_mask
        row_indices = series[combined_mask].index.tolist()
        if row_indices:
            total_outliers += len(row_indices)
            severity = "high" if len(row_indices) / max(1, row_count) >= 0.1 else "medium" if len(row_indices) >= 3 else "low"
            _add_issue(
                issues,
                "outlier",
                severity,
                [col],
                row_indices,
                f"{len(row_indices)} outliers detected in {col}",
                suggested_fix={"fix_type": "remove_outliers", "column": col, "method": "iqr", "action": "clip"},
                details={
                    "iqr_bounds": {"lower": float(lower), "upper": float(upper)} if iqr != 0 else None,
                    "zscore_threshold": 3,
                },
            )
            for idx in row_indices:
                if idx < 100:
                    cell_issues.setdefault(str(idx), {}).setdefault(col, []).append("outlier")

    # Duplicate rows
    duplicate_mask = df.duplicated()
    duplicate_indices = df[duplicate_mask].index.tolist()
    if duplicate_indices:
        _add_issue(
            issues,
            "duplicate",
            "high" if len(duplicate_indices) / max(1, row_count) > 0.1 else "medium",
            list(df.columns),
            duplicate_indices,
            f"{len(duplicate_indices)} duplicate rows detected",
            suggested_fix={"fix_type": "remove_duplicates"},
        )
        for idx in duplicate_indices:
            if idx < 100:
                for col in df.columns:
                    cell_issues.setdefault(str(idx), {}).setdefault(col, []).append("duplicate")

    # Inconsistent formats and mixed types
    format_issue_count = 0
    for col in df.columns:
        series = df[col]
        non_null = series.dropna()
        if non_null.empty:
            continue
        if inferred_types[col] == "date":
            parsed = pd.to_datetime(non_null, errors="coerce")
            invalid_indices = non_null[parsed.isna()].index.tolist()
            if invalid_indices:
                format_issue_count += len(invalid_indices)
                _add_issue(
                    issues,
                    "format",
                    "medium",
                    [col],
                    invalid_indices,
                    f"Inconsistent date formats in {col}",
                    suggested_fix={"fix_type": "fix_date_format", "column": col},
                )
                for idx in invalid_indices:
                    if idx < 100:
                        cell_issues.setdefault(str(idx), {}).setdefault(col, []).append("format")
        elif inferred_types[col] in {"email", "phone", "url"}:
            text_vals = non_null.astype(str)
            if inferred_types[col] == "email":
                invalid_mask = ~text_vals.apply(lambda v: bool(EMAIL_RE.match(v.strip())))
            elif inferred_types[col] == "phone":
                invalid_mask = ~text_vals.apply(lambda v: bool(PHONE_RE.match(v.strip())))
            else:
                invalid_mask = ~text_vals.apply(lambda v: bool(URL_RE.match(v.strip())))
            invalid_indices = text_vals[invalid_mask].index.tolist()
            if invalid_indices:
                format_issue_count += len(invalid_indices)
                _add_issue(
                    issues,
                    "format",
                    "medium",
                    [col],
                    invalid_indices,
                    f"Inconsistent {inferred_types[col]} formats in {col}",
                    suggested_fix={"fix_type": "trim_whitespace", "column": col},
                )
                for idx in invalid_indices:
                    if idx < 100:
                        cell_issues.setdefault(str(idx), {}).setdefault(col, []).append("format")

        # Mixed types
        type_groups = non_null.apply(lambda v: type(v).__name__).value_counts()
        if len(type_groups) > 1:
            mixed_indices = non_null.index.tolist()
            _add_issue(
                issues,
                "mixed_type",
                "medium",
                [col],
                mixed_indices,
                f"Mixed data types detected in {col}",
                suggested_fix={"fix_type": "convert_type", "column": col, "target_type": inferred_types[col]},
                details={"types": type_groups.to_dict()},
            )

    summary = {
        "missing_total": total_missing,
        "missing_pct": total_missing / max(1, row_count * column_count),
        "duplicate_rows": len(duplicate_indices),
        "duplicate_pct": len(duplicate_indices) / max(1, row_count),
        "outlier_total": total_outliers,
        "outlier_pct": total_outliers / max(1, row_count * max(1, len([c for c in df.columns if inferred_types[c] == "numeric"]))),
        "format_issue_total": format_issue_count,
        "format_issue_pct": format_issue_count / max(1, row_count * column_count),
    }
    quality_score = _compute_quality_score(summary)

    return AnalyzeResponse(
        session_id="",
        row_count=row_count,
        column_count=column_count,
        columns=columns_info,
        issues=issues,
        summary=summary,
        preview_rows=_preview_rows(df),
        preview_columns=list(df.columns),
        cell_issues=cell_issues,
        quality_score=quality_score,
    )


def _store_session(df: pd.DataFrame) -> str:
    session_id = uuid.uuid4().hex
    CLEANING_SESSIONS[session_id] = {
        "df": df,
        "undo": [],
        "redo": [],
        "analysis": None,
    }
    return session_id


def _get_session(session_id: str) -> Dict[str, Any]:
    session = CLEANING_SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Cleaning session not found.")
    return session


def _snapshot(session: Dict[str, Any]) -> None:
    session["undo"].append(session["df"].copy(deep=True))
    session["redo"].clear()


def _apply_fix(df: pd.DataFrame, req: FixRequest) -> pd.DataFrame:
    if req.fix_type == "fill_missing":
        if not req.column or req.column not in df.columns:
            raise HTTPException(status_code=400, detail="Column is required for fill_missing")
        series = df[req.column]
        method = (req.method or "median").lower()
        if method == "mean":
            value = pd.to_numeric(series, errors="coerce").mean()
            df[req.column] = series.fillna(value)
        elif method == "median":
            value = pd.to_numeric(series, errors="coerce").median()
            df[req.column] = series.fillna(value)
        elif method == "mode":
            mode_val = series.mode().iloc[0] if not series.mode().empty else None
            df[req.column] = series.fillna(mode_val)
        elif method == "forward-fill":
            df[req.column] = series.fillna(method="ffill")
        elif method == "custom":
            df[req.column] = series.fillna(req.value)
        else:
            raise HTTPException(status_code=400, detail="Unsupported fill method")

    elif req.fix_type == "remove_duplicates":
        df = df.drop_duplicates()

    elif req.fix_type == "fix_date_format":
        if not req.column or req.column not in df.columns:
            raise HTTPException(status_code=400, detail="Column is required for fix_date_format")
        parsed = pd.to_datetime(df[req.column], errors="coerce")
        df[req.column] = parsed.dt.strftime("%Y-%m-%d")

    elif req.fix_type == "trim_whitespace":
        if req.column and req.column in df.columns:
            df[req.column] = df[req.column].apply(lambda v: v.strip() if isinstance(v, str) else v)
        else:
            for col in df.select_dtypes(include=["object"]).columns:
                df[col] = df[col].apply(lambda v: v.strip() if isinstance(v, str) else v)

    elif req.fix_type == "standardize_case":
        case = (req.method or "lower").lower()
        target_cols = [req.column] if req.column and req.column in df.columns else list(df.select_dtypes(include=["object"]).columns)
        for col in target_cols:
            if case == "upper":
                df[col] = df[col].apply(lambda v: v.upper() if isinstance(v, str) else v)
            elif case == "title":
                df[col] = df[col].apply(lambda v: v.title() if isinstance(v, str) else v)
            else:
                df[col] = df[col].apply(lambda v: v.lower() if isinstance(v, str) else v)

    elif req.fix_type == "remove_outliers":
        if not req.column or req.column not in df.columns:
            raise HTTPException(status_code=400, detail="Column is required for remove_outliers")
        method = (req.method or "iqr").lower()
        action = (req.action or "clip").lower()
        series = pd.to_numeric(df[req.column], errors="coerce")
        if method == "zscore":
            mean = series.mean()
            std = series.std()
            if std == 0 or pd.isna(std):
                return df
            zscores = (series - mean) / std
            mask = zscores.abs() > 3
        else:
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            mask = (series < lower) | (series > upper)
        if action == "drop":
            df = df.loc[~mask].reset_index(drop=True)
        else:
            if method == "zscore":
                lower = mean - 3 * std
                upper = mean + 3 * std
            df[req.column] = series.clip(lower, upper)

    elif req.fix_type == "convert_type":
        if not req.column or req.column not in df.columns:
            raise HTTPException(status_code=400, detail="Column is required for convert_type")
        target = (req.target_type or "text").lower()
        if target == "numeric":
            df[req.column] = pd.to_numeric(df[req.column], errors="coerce")
        elif target == "date":
            df[req.column] = pd.to_datetime(df[req.column], errors="coerce").dt.strftime("%Y-%m-%d")
        else:
            df[req.column] = df[req.column].astype(str)

    elif req.fix_type == "undo" or req.fix_type == "redo":
        return df

    else:
        raise HTTPException(status_code=400, detail=f"Unknown fix_type: {req.fix_type}")

    return df


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_dataset(
    file: UploadFile = File(None),
    text_data: Optional[str] = Form(None),
):
    file_bytes = await file.read() if file is not None else None
    df = _read_table_from_upload(file_bytes, text_data)
    session_id = _store_session(df)
    analysis = _generate_analysis(df)
    analysis.session_id = session_id
    CLEANING_SESSIONS[session_id]["analysis"] = analysis.dict()
    return analysis


@router.post("/fix")
async def apply_fix(req: FixRequest):
    session = _get_session(req.session_id)
    if req.fix_type == "undo":
        if not session["undo"]:
            raise HTTPException(status_code=400, detail="Nothing to undo")
        session["redo"].append(session["df"].copy(deep=True))
        session["df"] = session["undo"].pop()
    elif req.fix_type == "redo":
        if not session["redo"]:
            raise HTTPException(status_code=400, detail="Nothing to redo")
        session["undo"].append(session["df"].copy(deep=True))
        session["df"] = session["redo"].pop()
    else:
        _snapshot(session)
        session["df"] = _apply_fix(session["df"], req)

    analysis = _generate_analysis(session["df"])
    analysis.session_id = req.session_id
    session["analysis"] = analysis.dict()

    buf = io.StringIO()
    session["df"].to_csv(buf, index=False)
    csv_data = buf.getvalue()

    return {
        "analysis": analysis.dict(),
        "undo_available": len(session["undo"]) > 0,
        "redo_available": len(session["redo"]) > 0,
        "csv": csv_data,
    }


@router.post("/auto-fix")
async def auto_fix(session_id: str = Form(...)):
    session = _get_session(session_id)
    _snapshot(session)
    df = session["df"]
    analysis = _generate_analysis(df)

    for issue in analysis.issues:
        fix = issue.get("suggested_fix") or {}
        if not fix:
            continue
        fix_req = FixRequest(session_id=session_id, **fix)
        df = _apply_fix(df, fix_req)
    session["df"] = df

    analysis = _generate_analysis(df)
    analysis.session_id = session_id
    session["analysis"] = analysis.dict()

    buf = io.StringIO()
    df.to_csv(buf, index=False)
    csv_data = buf.getvalue()

    return {
        "analysis": analysis.dict(),
        "undo_available": len(session["undo"]) > 0,
        "redo_available": len(session["redo"]) > 0,
        "csv": csv_data,
    }


@router.get("/rules")
async def list_rules():
    return {
        "rules": [
            {
                "id": "fill_missing",
                "name": "Fill Missing Values",
                "description": "Replace missing values using mean, median, mode, forward-fill, or custom value.",
            },
            {
                "id": "remove_duplicates",
                "name": "Remove Duplicates",
                "description": "Drop duplicate rows from the dataset.",
            },
            {
                "id": "fix_date_format",
                "name": "Fix Date Format",
                "description": "Standardize date columns to ISO format (YYYY-MM-DD).",
            },
            {
                "id": "trim_whitespace",
                "name": "Trim Whitespace",
                "description": "Remove leading/trailing whitespace in text columns.",
            },
            {
                "id": "standardize_case",
                "name": "Standardize Case",
                "description": "Convert text columns to upper, lower, or title case.",
            },
            {
                "id": "remove_outliers",
                "name": "Remove Outliers",
                "description": "Clip or drop outliers based on IQR or Z-score.",
            },
            {
                "id": "convert_type",
                "name": "Type Conversion",
                "description": "Convert column types (numeric, date, text).",
            },
            {
                "id": "undo",
                "name": "Undo",
                "description": "Revert the most recent cleaning operation.",
            },
            {
                "id": "redo",
                "name": "Redo",
                "description": "Re-apply the most recent undone operation.",
            },
        ]
    }
