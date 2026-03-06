from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime
from .validation import load_rules, validate_dataframe
from .analytics import (
    profile_data,
    compute_correlation_matrix,
    analyze_distribution,
    analyze_all_distributions,
    detect_outliers,
    analyze_all_outliers,
    generate_box_plot_data,
    generate_all_box_plots,
)
from .connectors import (
    list_connections,
    save_connection,
    delete_connection,
    test_connection,
    get_schema,
    execute_query,
    import_to_dataframe,
    get_engines_info,
    get_available_drivers,
)
from .cleaning import (
    CleaningPlan,
    TransformationRequest,
    remove_duplicates,
    drop_columns,
    drop_rows_with_nulls,
    fill_missing_numeric,
    fill_missing_categorical,
    apply_cleaning_plan,
    normalize_column,
    log_transform,
    one_hot_encode,
    scale_numeric,
    get_missing_value_summary,
    suggest_cleaning_operations,
)
from .insights import (
    generate_all_insights,
    generate_insights_with_ai,
    interpret_nl_query,
    NLQueryResponse,
)
import io
import json
import math
from .auth import (
    User,
    UserCredentials,
    Token,
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
)
from backend.api.nl_query import router as nl_query_router
from .db import (
    create_report,
    list_reports,
    get_report,
    delete_report,
    upsert_profile_settings,
    get_profile_settings,
    create_share,
    get_share,
    list_comments,
    create_comment,
    delete_comment,
)
from backend.api.data_cleaning import router as data_cleaning_router
from backend.api.dashboards import router as dashboards_router

app = FastAPI(title="Databotics API")
app.include_router(nl_query_router)
app.include_router(data_cleaning_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(dashboards_router, prefix="/api", tags=["dashboards"])

# ---- Server-side file session storage ----
import tempfile, uuid
from pathlib import Path as _Path

UPLOAD_DIR = _Path(tempfile.gettempdir()) / "databotics_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
_sessions: Dict[str, _Path] = {}
MAX_UPLOAD_SIZE = 52_428_800  # 50MB

# ---- Pydantic models ----
class ColumnStats(BaseModel):
    name: str
    type: str
    null_count: int
    null_pct: float
    stats: Optional[Dict[str, Any]] = None

class ProfileResponse(BaseModel):
    dataset_id: Optional[str]
    filename: Optional[str]
    row_count: int
    columns: List[ColumnStats]
    sample_rows: List[Dict[str, Any]]
    warnings: List[str] = []

class ValidateResponse(BaseModel):
    dataset_id: Optional[str]
    ruleset_id: Optional[str]
    summary: Dict[str, Any]
    violations: List[Dict[str, Any]]

class GenerateSQLRequest(BaseModel):
    question: str
    table: str
    schema: Dict[str, str]
    sample_rows: Optional[List[Dict[str,Any]]] = None
    model: Optional[str] = None

class GenerateSQLResponse(BaseModel):
    sql: str
    explanation: str
    safety: Dict[str,Any]

class AnalyzeRequest(BaseModel):
    columns: Optional[List[str]] = None
    outlier_method: Optional[str] = "iqr"
    null_spike_window: Optional[int] = 3
    null_spike_baseline: Optional[float] = 0.05
    type_mismatch_threshold: Optional[float] = 0.9
    webhook_url: Optional[str] = None
    webhook_threshold: Optional[int] = None

class AnalyzeResponse(BaseModel):
    anomalies: List[Dict[str,Any]]
    summary: Dict[str,Any]
    narrative: Optional[str] = None

class ReportCreateRequest(BaseModel):
    name: str
    payload: Dict[str, Any]

class ReportResponse(BaseModel):
    id: int
    name: str
    payload: Dict[str, Any]
    created_at: str

class ProfileSettingsRequest(BaseModel):
    webhook_url: Optional[str] = None
    webhook_threshold: Optional[int] = 1

class ProfileSettingsResponse(BaseModel):
    profile_id: str
    webhook_url: Optional[str] = None
    webhook_threshold: Optional[int] = 1
    updated_at: Optional[str] = None

class ShareResponse(BaseModel):
    profile_id: str
    token: str
    created_at: Optional[str] = None

class CommentCreateRequest(BaseModel):
    content: str
    chart_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: int
    profile_id: str
    chart_id: Optional[str] = None
    user_id: str
    content: str
    created_at: str

# ---- Helpers ----
def _read_table_from_upload(contents: bytes) -> pd.DataFrame:
    try:
        return pd.read_csv(io.BytesIO(contents))
    except Exception:
        try:
            return pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

def _get_session_df(session_id: str) -> pd.DataFrame:
    path = _sessions.get(session_id)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="Session not found. Upload a file first.")
    return _read_table_from_upload(path.read_bytes())


def enforce_upload_size(request: Request):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="Upload too large. Max size is 50MB.")


def _maybe_fire_webhook(anomalies: List[Dict[str, Any]], summary: Dict[str, Any], webhook_url: Optional[str], webhook_threshold: Optional[int], profile_id: Optional[str]) -> None:
    try:
        settings = None
        if profile_id:
            settings = get_profile_settings(profile_id)
        url = webhook_url or (settings.get("webhook_url") if settings else None)
        if not url:
            return
        threshold = webhook_threshold if webhook_threshold is not None else (settings.get("webhook_threshold") if settings else 1)
        threshold = int(threshold or 1)
        if len(anomalies) < threshold:
            return
        import requests
        payload = {
            "profile_id": profile_id,
            "summary": summary,
            "anomaly_count": len(anomalies),
            "anomalies": anomalies,
        }
        requests.post(url, json=payload, timeout=5)
    except Exception:
        return


# ---- Endpoints ----

@app.post('/auth/register', response_model=Token)
async def register(creds: UserCredentials):
    user = register_user(creds.username, creds.password)
    token = create_access_token({"sub": user.username})
    return Token(access_token=token)


@app.post('/auth/login', response_model=Token)
async def login(creds: UserCredentials):
    user = authenticate_user(creds.username, creds.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token({"sub": user.username})
    return Token(access_token=token)

@app.post('/upload')
async def upload_file(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """Store file server-side, return session_id for subsequent calls."""
    session_id = uuid.uuid4().hex
    dest = UPLOAD_DIR / f"{session_id}_{file.filename}"
    contents = await file.read()
    dest.write_bytes(contents)
    _sessions[session_id] = dest
    return {"session_id": session_id, "filename": file.filename, "size": len(contents)}


@app.get('/session/info/{session_id}')
async def get_session(session_id: str, _: User = Depends(get_current_user)):
    path = _sessions.get(session_id)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "filename": path.name, "size": path.stat().st_size}


@app.post('/profile/{session_id}', response_model=ProfileResponse)
async def profile_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Profile a previously uploaded file by session_id."""
    df = _get_session_df(session_id)
    cols = []
    for c in df.columns:
        null_count = int(df[c].isnull().sum())
        null_pct = float(null_count) / max(1, len(df))
        stats = None
        if pd.api.types.is_numeric_dtype(df[c]):
            stats = {
                'min': float(df[c].min()),
                'max': float(df[c].max()),
                'mean': float(df[c].mean()) if not math.isnan(df[c].mean()) else None,
                'std': float(df[c].std()) if not math.isnan(df[c].std()) else None,
            }
        cols.append(ColumnStats(name=str(c), type=str(df[c].dtype), null_count=null_count, null_pct=null_pct, stats=stats))
    sample = df.head(20).to_dict(orient='records')
    return ProfileResponse(dataset_id=session_id, filename=path.name if (path := _sessions.get(session_id)) else None, row_count=len(df), columns=cols, sample_rows=sample)


@app.post('/profile', response_model=ProfileResponse)
async def profile(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    cols = []
    for c in df.columns:
        null_count = int(df[c].isnull().sum())
        null_pct = float(null_count) / max(1, len(df))
        stats = None
        if pd.api.types.is_numeric_dtype(df[c]):
            stats = {
                'min': float(df[c].min()),
                'max': float(df[c].max()),
                'mean': float(df[c].mean()) if not math.isnan(df[c].mean()) else None,
                'std': float(df[c].std()) if not math.isnan(df[c].std()) else None,
            }
        cols.append(ColumnStats(name=str(c), type=str(df[c].dtype), null_count=null_count, null_pct=null_pct, stats=stats))
    sample = df.head(20).to_dict(orient='records')
    return ProfileResponse(dataset_id=None, filename=file.filename, row_count=len(df), columns=cols, sample_rows=sample)

@app.post('/validate', response_model=ValidateResponse)
async def validate(file: UploadFile = File(...), rules_path: str = 'ui/validation_rules/basic.yaml', _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    rules = load_rules(rules_path)
    report = validate_dataframe(df, rules)
    # normalize output
    return ValidateResponse(dataset_id=None, ruleset_id=None, summary=report.get('summary', {}), violations=report.get('errors', []))

def _run_clean(df: pd.DataFrame, trim_strings: bool, normalize_case: Optional[str], drop_duplicates: bool):
    if trim_strings:
        for c in df.select_dtypes(include=['object']).columns:
            df[c] = df[c].apply(lambda v: v.strip() if isinstance(v, str) else v)
    if normalize_case in ('lower','upper'):
        for c in df.select_dtypes(include=['object']).columns:
            if normalize_case == 'lower':
                df[c] = df[c].apply(lambda v: v.lower() if isinstance(v, str) else v)
            else:
                df[c] = df[c].apply(lambda v: v.upper() if isinstance(v, str) else v)
    if drop_duplicates:
        df = df.drop_duplicates()
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
        table = pa.Table.from_pandas(df)
        buf = io.BytesIO()
        pq.write_table(table, buf)
        buf.seek(0)
        return StreamingResponse(buf, media_type='application/octet-stream', headers={'Content-Disposition':'attachment; filename="cleaned.parquet"'})
    except Exception:
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        buf.seek(0)
        return StreamingResponse(io.BytesIO(buf.getvalue().encode('utf-8')), media_type='text/csv', headers={'Content-Disposition':'attachment; filename="cleaned.csv"'})


def _run_analyze(
    df: pd.DataFrame,
    columns: Optional[List[str]],
    outlier_method: Optional[str],
    null_spike_window: Optional[int],
    null_spike_baseline: Optional[float],
    type_mismatch_threshold: Optional[float],
    webhook_url: Optional[str] = None,
    webhook_threshold: Optional[int] = None,
    profile_id: Optional[str] = None,
):
    df = df.reset_index(drop=True)
    selected_columns = columns or list(df.columns)
    selected_columns = [c for c in selected_columns if c in df.columns]

    def _normalize_value(value: Any):
        if isinstance(value, (np.integer, np.floating)):
            return value.item()
        if isinstance(value, (pd.Timestamp, datetime)):
            return value.isoformat()
        return value

    def _row_dict(idx: int):
        row = df.iloc[idx].to_dict()
        return {k: _normalize_value(v) for k, v in row.items()}

    anomalies: list[dict] = []
    outlier_method = (outlier_method or "iqr").lower()
    null_spike_window = max(2, int(null_spike_window or 3))
    null_spike_baseline = float(null_spike_baseline or 0.05)
    type_mismatch_threshold = float(type_mismatch_threshold or 0.9)

    type_expectations: dict[str, str] = {}

    for col in selected_columns:
        series = df[col]
        non_null = series.dropna()
        if non_null.empty:
            type_expectations[col] = "unknown"
            continue
        numeric_ratio = pd.to_numeric(non_null, errors="coerce").notna().mean()
        datetime_ratio = pd.to_datetime(non_null, errors="coerce").notna().mean()
        if numeric_ratio >= type_mismatch_threshold:
            type_expectations[col] = "numeric"
        elif datetime_ratio >= type_mismatch_threshold:
            type_expectations[col] = "datetime"
        else:
            type_expectations[col] = "string"

    # Type mismatch detection
    for col in selected_columns:
        expected = type_expectations.get(col, "string")
        if expected not in ("numeric", "datetime"):
            continue
        series = df[col]
        for idx, value in series.items():
            if pd.isna(value):
                continue
            if expected == "numeric":
                is_valid = pd.to_numeric(pd.Series([value]), errors="coerce").notna().iloc[0]
            else:
                is_valid = pd.to_datetime(pd.Series([value]), errors="coerce").notna().iloc[0]
            if not is_valid:
                anomalies.append({
                    "row_index": idx + 1,
                    "column": col,
                    "type": "type_mismatch",
                    "value": _normalize_value(value),
                    "expected_type": expected,
                    "details": {
                        "expected_type": expected,
                    },
                    "row": _row_dict(idx),
                })

    # Outlier detection
    for col in selected_columns:
        if type_expectations.get(col) != "numeric":
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        numeric = series.dropna()
        if numeric.empty:
            continue
        if outlier_method == "zscore":
            mean = numeric.mean()
            std = numeric.std()
            if not std or std == 0:
                continue
            zscores = (series - mean) / std
            mask = zscores.abs() > 3
            for idx in series[mask].index:
                anomalies.append({
                    "row_index": idx + 1,
                    "column": col,
                    "type": "outlier",
                    "value": _normalize_value(series.loc[idx]),
                    "expected_type": "numeric",
                    "details": {
                        "method": "zscore",
                        "zscore": float(zscores.loc[idx]),
                        "threshold": 3,
                        "mean": float(mean),
                        "std": float(std),
                    },
                    "row": _row_dict(idx),
                })
        else:
            q1 = numeric.quantile(0.25)
            q3 = numeric.quantile(0.75)
            iqr = q3 - q1
            if pd.isna(iqr) or iqr == 0:
                continue
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            mask = (series < lower) | (series > upper)
            for idx in series[mask].index:
                anomalies.append({
                    "row_index": idx + 1,
                    "column": col,
                    "type": "outlier",
                    "value": _normalize_value(series.loc[idx]),
                    "expected_type": "numeric",
                    "details": {
                        "method": "iqr",
                        "lower_bound": float(lower),
                        "upper_bound": float(upper),
                        "iqr": float(iqr),
                    },
                    "row": _row_dict(idx),
                })

    # Null spike detection
    for col in selected_columns:
        series = df[col]
        null_ratio = series.isna().mean()
        if null_ratio <= 0 or null_ratio >= 1:
            continue
        if null_ratio > null_spike_baseline:
            continue
        streak_start = None
        streak_len = 0
        for idx, value in series.items():
            if pd.isna(value):
                if streak_start is None:
                    streak_start = idx
                    streak_len = 1
                else:
                    streak_len += 1
            else:
                if streak_start is not None and streak_len >= null_spike_window:
                    for row_idx in range(streak_start, streak_start + streak_len):
                        anomalies.append({
                            "row_index": row_idx + 1,
                            "column": col,
                            "type": "null_spike",
                            "value": None,
                            "expected_type": type_expectations.get(col, "string"),
                            "details": {
                                "streak_length": streak_len,
                                "baseline_null_ratio": float(null_ratio),
                                "window": null_spike_window,
                            },
                            "row": _row_dict(row_idx),
                        })
                streak_start = None
                streak_len = 0
        if streak_start is not None and streak_len >= null_spike_window:
            for row_idx in range(streak_start, streak_start + streak_len):
                anomalies.append({
                    "row_index": row_idx + 1,
                    "column": col,
                    "type": "null_spike",
                    "value": None,
                    "expected_type": type_expectations.get(col, "string"),
                    "details": {
                        "streak_length": streak_len,
                        "baseline_null_ratio": float(null_ratio),
                        "window": null_spike_window,
                    },
                    "row": _row_dict(row_idx),
                })

    summary = {
        "count": len(anomalies),
        "by_type": {
            "type_mismatch": sum(1 for a in anomalies if a["type"] == "type_mismatch"),
            "outlier": sum(1 for a in anomalies if a["type"] == "outlier"),
            "null_spike": sum(1 for a in anomalies if a["type"] == "null_spike"),
        },
    }
    narrative = "Row-level anomaly scan completed."
    _maybe_fire_webhook(anomalies, summary, webhook_url, webhook_threshold, profile_id)
    return AnalyzeResponse(anomalies=anomalies, summary=summary, narrative=narrative)


@app.post('/clean')
async def clean(file: UploadFile = File(...), trim_strings: bool = True, normalize_case: Optional[str] = None, drop_duplicates: bool = False, _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    return _run_clean(df, trim_strings, normalize_case, drop_duplicates)

@app.post('/generate_sql', response_model=GenerateSQLResponse)
async def generate_sql(req: GenerateSQLRequest, _: User = Depends(get_current_user)):
    # deterministic fallback when no OPENAI_API_KEY
    import os
    key = os.getenv('OPENAI_API_KEY') or os.getenv('ANTHROPIC_API_KEY') or os.getenv('MOONSHOT_API_KEY')
    if not key:
        # simple rule-based generator
        # support: SELECT columns WHERE conditions ORDER BY ... LIMIT n
        col_list = ', '.join([f'"{k}"' for k in req.schema.keys()])
        sql = f"SELECT {col_list} FROM {req.table} LIMIT 100;"
        return GenerateSQLResponse(sql=sql, explanation='Fallback deterministic SQL: select top 100 rows', safety={'is_safe': True, 'reasons': []})
    # if key exists, call LLM wrapper (mockable)
    try:
        from .llm import generate_sql as llm_generate_sql
        sql, expl = llm_generate_sql(req.question, req.schema, req.sample_rows, model=req.model or "claude")
        return GenerateSQLResponse(sql=sql, explanation=expl, safety={'is_safe': True, 'reasons': []})
    except Exception:
        # fallback
        col_list = ', '.join([f'"{k}"' for k in req.schema.keys()])
        sql = f"SELECT {col_list} FROM {req.table} LIMIT 100;"
        return GenerateSQLResponse(sql=sql, explanation='Fallback deterministic SQL due to LLM error', safety={'is_safe': True, 'reasons': []})

@app.post('/analyze', response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
    __: None = Depends(enforce_upload_size),
    columns: Optional[str] = None,
    outlier_method: Optional[str] = "iqr",
    null_spike_window: Optional[int] = 3,
    null_spike_baseline: Optional[float] = 0.05,
    type_mismatch_threshold: Optional[float] = 0.9,
    webhook_url: Optional[str] = None,
    webhook_threshold: Optional[int] = None,
):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    column_list = [c.strip() for c in columns.split(",")] if columns else None
    return _run_analyze(
        df,
        column_list,
        outlier_method,
        null_spike_window,
        null_spike_baseline,
        type_mismatch_threshold,
        webhook_url,
        webhook_threshold,
    )

@app.post('/query')
async def query(file: UploadFile = File(...), sql: str = '', _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    return _run_query(df, sql)


@app.post('/query/{session_id}')
async def query_by_session(session_id: str, sql: str = '', _: User = Depends(get_current_user)):
    df = _get_session_df(session_id)
    return _run_query(df, sql)


def _run_query(df: pd.DataFrame, sql: str):
    try:
        import duckdb
        con = duckdb.connect(database=':memory:')
        con.register('loaded_table', df)
        res = con.execute(sql).fetchdf()
        rows = res.to_dict(orient='records')
        cols = list(res.columns)
        return {'columns': cols, 'rows': rows, 'row_count': len(res)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/validate/{session_id}')
async def validate_by_session(session_id: str, rules_path: str = 'ui/validation_rules/basic.yaml', _: User = Depends(get_current_user)):
    df = _get_session_df(session_id)
    rules = load_rules(rules_path)
    report = validate_dataframe(df, rules)
    return ValidateResponse(dataset_id=session_id, ruleset_id=None, summary=report.get('summary', {}), violations=report.get('errors', []))


@app.post('/clean/{session_id}')
async def clean_by_session(session_id: str, trim_strings: bool = True, normalize_case: Optional[str] = None, drop_duplicates: bool = False, _: User = Depends(get_current_user)):
    df = _get_session_df(session_id)
    return _run_clean(df, trim_strings, normalize_case, drop_duplicates)


@app.post('/analyze/{session_id}')
async def analyze_by_session(
    session_id: str,
    _: User = Depends(get_current_user),
    columns: Optional[str] = None,
    outlier_method: Optional[str] = "iqr",
    null_spike_window: Optional[int] = 3,
    null_spike_baseline: Optional[float] = 0.05,
    type_mismatch_threshold: Optional[float] = 0.9,
    webhook_url: Optional[str] = None,
    webhook_threshold: Optional[int] = None,
):
    df = _get_session_df(session_id)
    column_list = [c.strip() for c in columns.split(",")] if columns else None
    return _run_analyze(
        df,
        column_list,
        outlier_method,
        null_spike_window,
        null_spike_baseline,
        type_mismatch_threshold,
        webhook_url,
        webhook_threshold,
        profile_id=session_id,
    )


# ============================================================================
# PHASE 2: Core Analytics Endpoints
# ============================================================================

@app.post('/correlate')
async def correlate(file: UploadFile = File(...), method: str = 'pearson', _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Compute correlation matrix for numeric columns.
    
    Args:
        file: CSV/Excel file to analyze
        method: Correlation method ('pearson', 'spearman', 'kendall')
        
    Returns:
        CorrelationMatrix with column names and correlation values
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        corr_result = compute_correlation_matrix(df, method=method)
        return corr_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/correlate/{session_id}')
async def correlate_by_session(session_id: str, method: str = 'pearson', _: User = Depends(get_current_user)):
    """Compute correlation matrix for a session file."""
    df = _get_session_df(session_id)
    
    try:
        corr_result = compute_correlation_matrix(df, method=method)
        return corr_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/box-plots')
async def get_box_plots(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Generate box plot data for all numeric columns.
    
    Returns:
        List of BoxPlotData objects with quartiles and outliers
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        plots = generate_all_box_plots(df)
        return {'box_plots': plots}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/box-plots/{session_id}')
async def get_box_plots_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Generate box plot data for session file."""
    df = _get_session_df(session_id)
    
    try:
        plots = generate_all_box_plots(df)
        return {'box_plots': plots}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/outliers')
async def get_outliers(file: UploadFile = File(...), method: str = 'iqr', threshold: float = 1.5, _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Detect outliers in all numeric columns using IQR method.
    
    Args:
        file: CSV/Excel file to analyze
        method: Detection method ('iqr')
        threshold: IQR multiplier for bounds (default 1.5)
        
    Returns:
        List of OutlierDetectionResult for each numeric column
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        outlier_results = analyze_all_outliers(df)
        return {'outliers': outlier_results, 'method': method, 'threshold': threshold}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/outliers/{session_id}')
async def get_outliers_by_session(session_id: str, method: str = 'iqr', threshold: float = 1.5, _: User = Depends(get_current_user)):
    """Detect outliers in session file."""
    df = _get_session_df(session_id)
    
    try:
        outlier_results = analyze_all_outliers(df)
        return {'outliers': outlier_results, 'method': method, 'threshold': threshold}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/distributions')
async def get_distributions(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Analyze distribution for all columns.
    
    Returns:
        List of DistributionAnalysis for each column
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        distributions = analyze_all_distributions(df)
        return {'distributions': distributions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/distributions/{session_id}')
async def get_distributions_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Analyze distributions for session file."""
    df = _get_session_df(session_id)
    
    try:
        distributions = analyze_all_distributions(df)
        return {'distributions': distributions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/profile-advanced')
async def profile_advanced(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Generate comprehensive data profile with all statistics.
    
    Returns:
        DataProfile with column-level and dataset-level statistics
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        profile = profile_data(df)
        return profile
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/profile-advanced/{session_id}')
async def profile_advanced_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Generate comprehensive profile for session file."""
    df = _get_session_df(session_id)
    
    try:
        profile = profile_data(df)
        return profile
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# PHASE 3: Data Cleaning & Transformation Endpoints
# ============================================================================

@app.post('/clean-advanced')
async def clean_advanced(file: UploadFile = File(...), plan: CleaningPlan = None, _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Apply advanced cleaning operations with comprehensive plan.
    
    Args:
        file: CSV/Excel file to clean
        plan: CleaningPlan with remove_duplicates, drop_columns, fill_missing_strategy, etc.
        
    Returns:
        Cleaned CSV file with cleaning report
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    if not plan:
        raise HTTPException(status_code=400, detail="Cleaning plan is required")
    
    try:
        df_cleaned, report = apply_cleaning_plan(df, plan)
        
        # Return CSV with report
        buf = io.StringIO()
        df_cleaned.to_csv(buf, index=False)
        buf.seek(0)
        
        return {
            'report': report,
            'file': StreamingResponse(
                io.BytesIO(buf.getvalue().encode('utf-8')),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="cleaned.csv"'}
            )
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/clean-advanced/{session_id}')
async def clean_advanced_by_session(session_id: str, plan: CleaningPlan = None, _: User = Depends(get_current_user)):
    """Apply advanced cleaning to session file."""
    df = _get_session_df(session_id)
    
    if not plan:
        raise HTTPException(status_code=400, detail="Cleaning plan is required")
    
    try:
        df_cleaned, report = apply_cleaning_plan(df, plan)
        
        # Return CSV with report
        buf = io.StringIO()
        df_cleaned.to_csv(buf, index=False)
        buf.seek(0)
        
        return {
            'report': report,
            'file': StreamingResponse(
                io.BytesIO(buf.getvalue().encode('utf-8')),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="cleaned.csv"'}
            )
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/missing-values')
async def get_missing_values(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """Get detailed missing value summary."""
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        summary = get_missing_value_summary(df)
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/missing-values/{session_id}')
async def get_missing_values_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Get missing value summary for session file."""
    df = _get_session_df(session_id)
    
    try:
        summary = get_missing_value_summary(df)
        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/suggest-cleaning')
async def suggest_cleaning(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """Get AI-like suggestions for data cleaning."""
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        suggestions = suggest_cleaning_operations(df)
        return {'suggestions': suggestions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/suggest-cleaning/{session_id}')
async def suggest_cleaning_by_session(session_id: str, _: User = Depends(get_current_user)):
    """Get cleaning suggestions for session file."""
    df = _get_session_df(session_id)
    
    try:
        suggestions = suggest_cleaning_operations(df)
        return {'suggestions': suggestions}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/transform')
async def transform_data(
    file: UploadFile = File(...),
    column: str = None,
    transformation: str = None,
    method: Optional[str] = None,
    _: User = Depends(get_current_user),
    __: None = Depends(enforce_upload_size)
):
    """
    Apply column transformation (normalize, scale, one-hot encode, log, etc.).
    
    Args:
        file: CSV/Excel file
        column: Column name to transform
        transformation: 'normalize', 'scale', 'one_hot_encode', 'log'
        method: Method-specific ('min_max', 'z_score', 'robust' for normalize)
        
    Returns:
        Transformed CSV file with transformation parameters
    """
    if not column or not transformation:
        raise HTTPException(status_code=400, detail="column and transformation are required")
    
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        if transformation == 'normalize':
            method = method or 'min_max'
            df_transformed, params = normalize_column(df, column, method)
        elif transformation == 'scale':
            df_transformed, params = scale_numeric(df, column)
        elif transformation == 'one_hot_encode':
            df_transformed, params = one_hot_encode(df, column)
        elif transformation == 'log':
            df_transformed, params = log_transform(df, column)
        else:
            raise ValueError(f"Unknown transformation: {transformation}")
        
        # Return CSV with params
        buf = io.StringIO()
        df_transformed.to_csv(buf, index=False)
        buf.seek(0)
        
        return {
            'transformation': transformation,
            'column': column,
            'parameters': params,
            'file': StreamingResponse(
                io.BytesIO(buf.getvalue().encode('utf-8')),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="transformed.csv"'}
            )
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/transform/{session_id}')
async def transform_data_by_session(
    session_id: str,
    column: str = None,
    transformation: str = None,
    method: Optional[str] = None,
    _: User = Depends(get_current_user)
):
    """Apply transformation to session file."""
    if not column or not transformation:
        raise HTTPException(status_code=400, detail="column and transformation are required")
    
    df = _get_session_df(session_id)
    
    try:
        if transformation == 'normalize':
            method = method or 'min_max'
            df_transformed, params = normalize_column(df, column, method)
        elif transformation == 'scale':
            df_transformed, params = scale_numeric(df, column)
        elif transformation == 'one_hot_encode':
            df_transformed, params = one_hot_encode(df, column)
        elif transformation == 'log':
            df_transformed, params = log_transform(df, column)
        else:
            raise ValueError(f"Unknown transformation: {transformation}")
        
        # Return CSV with params
        buf = io.StringIO()
        df_transformed.to_csv(buf, index=False)
        buf.seek(0)
        
        return {
            'transformation': transformation,
            'column': column,
            'parameters': params,
            'file': StreamingResponse(
                io.BytesIO(buf.getvalue().encode('utf-8')),
                media_type='text/csv',
                headers={'Content-Disposition': 'attachment; filename="transformed.csv"'}
            )
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# PHASE 4: AI-Powered Insights Endpoints
# ============================================================================

@app.post('/insights')
async def get_insights(file: UploadFile = File(...), use_ai: bool = True, model: Optional[str] = None, _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Generate smart insights from data using AI or heuristics.
    
    Args:
        file: CSV/Excel file to analyze
        use_ai: Use Claude API if available (default True)
        
    Returns:
        InsightReport with 5-10 smart insights
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        if use_ai:
            report = generate_insights_with_ai(df, file.filename, model=model)
        else:
            report = generate_all_insights(df, file.filename, ai_model="heuristic")
        
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/insights/{session_id}')
async def get_insights_by_session(session_id: str, use_ai: bool = True, model: Optional[str] = None, _: User = Depends(get_current_user)):
    """Generate insights for session file."""
    df = _get_session_df(session_id)
    
    try:
        if use_ai:
            report = generate_insights_with_ai(df, model=model)
        else:
            report = generate_all_insights(df, ai_model="heuristic")
        
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class NLQueryInput(BaseModel):
    """Natural language query input."""
    query: str


@app.post('/query-nl')
async def query_natural_language(req: NLQueryInput, file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Process natural language query on data.
    
    Args:
        req: NLQueryInput with question
        file: CSV/Excel file to query
        
    Returns:
        NLQueryResponse with interpretation and suggestions
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        response = interpret_nl_query(req.query, df)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/query-nl/{session_id}')
async def query_natural_language_by_session(session_id: str, req: NLQueryInput, _: User = Depends(get_current_user)):
    """Process natural language query on session file."""
    df = _get_session_df(session_id)
    
    try:
        response = interpret_nl_query(req.query, df)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# PHASE 5: Session Management & Advanced UX
# ============================================================================

from .sessions import (
    get_session_manager,
    AnalysisState,
    UndoRedoManager,
    get_shortcuts_for_platform,
    KEYBOARD_SHORTCUTS,
)

@app.post('/session/save')
async def save_session(file: UploadFile = File(...), session_data: str = '', _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Save current analysis session.
    
    Args:
        file: CSV/Excel file
        session_data: JSON string with analysis state (optional)
        
    Returns:
        Session metadata
    """
    contents = await file.read()
    df = _read_table_from_upload(contents)
    
    try:
        manager = get_session_manager()
        state = manager.create_session(file.filename, df, user_id=_.username)
        
        # Update with additional state if provided
        if session_data:
            try:
                import json
                state_update = json.loads(session_data)
                for key, value in state_update.items():
                    if hasattr(state, key):
                        setattr(state, key, value)
                manager.save_state(state)
            except:
                pass
        
        return {
            'session_id': state.session_id,
            'filename': state.filename,
            'created_at': state.created_at,
            'data_shape': state.data_shape,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/session/list')
async def list_sessions(_: User = Depends(get_current_user)):
    """List all sessions for current user."""
    try:
        manager = get_session_manager()
        sessions = manager.list_sessions(user_id=_.username)
        
        return {
            'sessions': [
                {
                    'session_id': s.session_id,
                    'filename': s.filename,
                    'created_at': s.created_at,
                    'last_modified': s.last_modified,
                    'data_shape': s.data_shape,
                    'size_kb': s.size_kb,
                }
                for s in sessions
            ],
            'count': len(sessions),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/session/load/{session_id}')
async def load_session(session_id: str, _: User = Depends(get_current_user)):
    """
    Load saved session.
    
    Args:
        session_id: Session to load
        
    Returns:
        Analysis state and session metadata
    """
    try:
        manager = get_session_manager()
        state = manager.load_state(session_id)
        
        if not state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            'session_id': state.session_id,
            'filename': state.filename,
            'created_at': state.created_at,
            'last_modified': state.last_modified,
            'data_shape': state.data_shape,
            'columns': state.columns,
            'operations': state.operations,
            'insights': state.insights,
            'selected_columns': state.selected_columns,
            'active_visualization': state.active_visualization,
            'filters': state.filters,
            'theme': state.theme,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/session/{session_id}')
async def delete_session(session_id: str, _: User = Depends(get_current_user)):
    """Delete a session."""
    try:
        manager = get_session_manager()
        success = manager.delete_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {'success': True, 'session_id': session_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/session/export/{session_id}')
async def export_session(session_id: str, _: User = Depends(get_current_user)):
    """
    Export session as .zip file.
    
    Args:
        session_id: Session to export
        
    Returns:
        .zip file download
    """
    import tempfile
    
    try:
        manager = get_session_manager()
        
        # Create temporary zip file
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
            tmp_path = tmp.name
        
        success = manager.export_session(session_id, tmp_path)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Read and return zip
        with open(tmp_path, 'rb') as f:
            content = f.read()
        
        # Cleanup
        import os
        os.unlink(tmp_path)
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type='application/zip',
            headers={'Content-Disposition': f'attachment; filename="session-{session_id}.zip"'}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/session/import')
async def import_session(file: UploadFile = File(...), _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    """
    Import previously exported session.
    
    Args:
        file: .zip file with exported session
        
    Returns:
        New session metadata
    """
    import tempfile
    
    try:
        manager = get_session_manager()
        
        # Save uploaded zip to temp file
        contents = await file.read()
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        # Import
        new_session_id = manager.import_session(tmp_path)
        
        # Cleanup
        import os
        os.unlink(tmp_path)
        
        if not new_session_id:
            raise HTTPException(status_code=400, detail="Invalid session file")
        
        state = manager.load_state(new_session_id)
        
        return {
            'session_id': new_session_id,
            'filename': state.filename if state else 'imported',
            'created_at': state.created_at if state else '',
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/shortcuts')
async def get_keyboard_shortcuts(platform: str = 'windows', _: User = Depends(get_current_user)):
    """
    Get keyboard shortcuts for platform.
    
    Args:
        platform: 'windows' or 'mac'
        
    Returns:
        Keyboard shortcuts mapping
    """
    try:
        shortcuts = get_shortcuts_for_platform(platform)
        return {
            'platform': platform,
            'shortcuts': shortcuts,
            'all_shortcuts': KEYBOARD_SHORTCUTS,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Database Connectors ───────────────────────────────────────────────

class ConnectionBody(BaseModel):
    name: str = ""
    engine: str = ""
    host: str = ""
    port: Optional[int] = None
    database: str = ""
    username: str = ""
    password: str = ""
    ssl: bool = True
    connection_string: str = ""
    options: dict = {}
    tags: list = []
    color: str = ""
    id: Optional[str] = None

class QueryBody(BaseModel):
    query: str
    limit: int = 1000

class QueryRefineRequest(BaseModel):
    query: str

class QueryRefineResponse(BaseModel):
    query: str
    explanation: str = ""
    model: Optional[str] = None

@app.get('/connectors/engines')
async def api_engines(_: User = Depends(get_current_user)):
    return get_engines_info()

@app.get('/connectors/drivers')
async def api_drivers(_: User = Depends(get_current_user)):
    return get_available_drivers()

@app.get('/connectors')
async def api_list_connections(_: User = Depends(get_current_user)):
    return list_connections()

@app.post('/connectors')
async def api_save_connection(body: ConnectionBody, _: User = Depends(get_current_user)):
    return save_connection(body.dict())

@app.put('/connectors/{conn_id}')
async def api_update_connection(conn_id: str, body: ConnectionBody, _: User = Depends(get_current_user)):
    data = body.dict()
    data["id"] = conn_id
    return save_connection(data)

@app.delete('/connectors/{conn_id}')
async def api_delete_connection(conn_id: str, _: User = Depends(get_current_user)):
    if not delete_connection(conn_id):
        raise HTTPException(404, "Connection not found")
    return {"deleted": True}

@app.post('/connectors/{conn_id}/test')
async def api_test_connection(conn_id: str, _: User = Depends(get_current_user)):
    return test_connection(conn_id)

@app.get('/connectors/{conn_id}/schema')
async def api_get_schema(conn_id: str, _: User = Depends(get_current_user)):
    result = get_schema(conn_id)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result

@app.post('/connectors/{conn_id}/refine_query', response_model=QueryRefineResponse)
async def api_refine_query(conn_id: str, body: QueryRefineRequest, _: User = Depends(get_current_user)):
    import os
    key = os.getenv('OPENAI_API_KEY') or os.getenv('ANTHROPIC_API_KEY') or os.getenv('MOONSHOT_API_KEY')
    if not key:
        return QueryRefineResponse(query=body.query, explanation='AI not configured; running original SQL.')

    schema = get_schema(conn_id)
    schema_tables = schema.get("tables", []) if isinstance(schema, dict) else []
    conn_engine = None
    for conn in list_connections():
        if conn.get("id") == conn_id:
            conn_engine = conn.get("engine")
            break

    try:
        from .llm import refine_sql
        refined, explanation = refine_sql(body.query, schema_tables, engine=conn_engine)
        return QueryRefineResponse(query=refined or body.query, explanation=explanation or "AI refined the SQL.")
    except Exception:
        return QueryRefineResponse(query=body.query, explanation='AI refinement unavailable; running original SQL.')

@app.post('/connectors/{conn_id}/query')
async def api_execute_query(conn_id: str, body: QueryBody, _: User = Depends(get_current_user)):
    result = execute_query(conn_id, body.query, body.limit)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result

@app.post('/connectors/{conn_id}/import')
async def api_import_to_session(conn_id: str, body: QueryBody, _: User = Depends(get_current_user)):
    try:
        df = import_to_dataframe(conn_id, body.query)
        import hashlib as _hlib
        session_id = _hlib.md5(f"{conn_id}:{body.query}:{id(df)}".encode()).hexdigest()[:12]
        tmp = _Path(tempfile.gettempdir()) / f"{session_id}.parquet"
        df.to_parquet(tmp, index=False)
        _sessions[session_id] = tmp
        return {
            "session_id": session_id,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        }
    except Exception as e:
        raise HTTPException(400, str(e))


# ── Reports ─────────────────────────────────────────────────────────────

@app.get('/reports', response_model=List[ReportResponse])
async def api_list_reports(current: User = Depends(get_current_user)):
    reports = list_reports(current.username)
    result = []
    for r in reports:
        try:
            payload = json.loads(r.get("payload", "{}"))
        except Exception:
            payload = {}
        result.append(ReportResponse(id=r["id"], name=r["name"], payload=payload, created_at=r["created_at"]))
    return result


@app.post('/reports', response_model=ReportResponse)
async def api_create_report(body: ReportCreateRequest, current: User = Depends(get_current_user)):
    payload = json.dumps(body.payload)
    report = create_report(current.username, body.name, payload)
    return ReportResponse(id=report["id"], name=report["name"], payload=body.payload, created_at=report["created_at"])


@app.get('/reports/{report_id}', response_model=ReportResponse)
async def api_get_report(report_id: int, current: User = Depends(get_current_user)):
    report = get_report(report_id, current.username)
    if not report:
        raise HTTPException(404, "Report not found")
    try:
        payload = json.loads(report.get("payload", "{}"))
    except Exception:
        payload = {}
    return ReportResponse(id=report["id"], name=report["name"], payload=payload, created_at=report["created_at"])


@app.delete('/reports/{report_id}')
async def api_delete_report(report_id: int, current: User = Depends(get_current_user)):
    if not delete_report(report_id, current.username):
        raise HTTPException(404, "Report not found")
    return {"deleted": True}


# ── Profile Settings & Sharing ───────────────────────────────────────────

@app.get('/profiles/{profile_id}/settings', response_model=ProfileSettingsResponse)
async def api_get_profile_settings(profile_id: str, _: User = Depends(get_current_user)):
    settings = get_profile_settings(profile_id) or {"profile_id": profile_id, "webhook_url": None, "webhook_threshold": 1, "updated_at": None}
    return ProfileSettingsResponse(**settings)


@app.put('/profiles/{profile_id}/settings', response_model=ProfileSettingsResponse)
async def api_update_profile_settings(profile_id: str, body: ProfileSettingsRequest, _: User = Depends(get_current_user)):
    settings = upsert_profile_settings(profile_id, body.webhook_url, body.webhook_threshold)
    return ProfileSettingsResponse(**settings)


@app.post('/profiles/{profile_id}/share', response_model=ShareResponse)
async def api_create_share(profile_id: str, _: User = Depends(get_current_user)):
    import uuid
    token = uuid.uuid4().hex
    share = create_share(profile_id, token)
    return ShareResponse(profile_id=share["profile_id"], token=share["token"], created_at=share.get("created_at"))


@app.get('/share/{token}')
async def api_share_view(token: str):
    share = get_share(token)
    if not share:
        raise HTTPException(404, "Share not found")
    profile_id = share["profile_id"]
    df = _get_session_df(profile_id)
    cols = []
    for c in df.columns:
        null_count = int(df[c].isnull().sum())
        null_pct = float(null_count) / max(1, len(df))
        stats = None
        if pd.api.types.is_numeric_dtype(df[c]):
            stats = {
                'min': float(df[c].min()),
                'max': float(df[c].max()),
                'mean': float(df[c].mean()) if not math.isnan(df[c].mean()) else None,
                'std': float(df[c].std()) if not math.isnan(df[c].std()) else None,
            }
        cols.append(ColumnStats(name=str(c), type=str(df[c].dtype), null_count=null_count, null_pct=null_pct, stats=stats))
    sample = df.head(20).to_dict(orient='records')
    return ProfileResponse(dataset_id=profile_id, filename=_sessions.get(profile_id).name if _sessions.get(profile_id) else None, row_count=len(df), columns=cols, sample_rows=sample)


# ── Comments ─────────────────────────────────────────────────────────────

@app.get('/profiles/{profile_id}/comments', response_model=List[CommentResponse])
async def api_list_comments(profile_id: str, _: User = Depends(get_current_user)):
    comments = list_comments(profile_id)
    return [CommentResponse(**c) for c in comments]


@app.post('/profiles/{profile_id}/comments', response_model=CommentResponse)
async def api_create_comment(profile_id: str, body: CommentCreateRequest, current: User = Depends(get_current_user)):
    comment = create_comment(profile_id, body.chart_id, current.username, body.content)
    return CommentResponse(**comment)


@app.delete('/profiles/{profile_id}/comments/{comment_id}')
async def api_delete_comment(profile_id: str, comment_id: int, current: User = Depends(get_current_user)):
    if not delete_comment(comment_id, current.username):
        raise HTTPException(404, "Comment not found")
    return {"deleted": True}
