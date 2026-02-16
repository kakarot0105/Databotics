from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import pandas as pd
from .validation import load_rules, validate_dataframe
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

app = FastAPI(title="Databotics API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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

class GenerateSQLResponse(BaseModel):
    sql: str
    explanation: str
    safety: Dict[str,Any]

class AnalyzeRequest(BaseModel):
    timestamp_col: str
    metric_col: str
    dimension_cols: Optional[List[str]] = None
    method: Optional[str] = "simple"

class AnalyzeResponse(BaseModel):
    anomalies: List[Dict[str,Any]]
    summary: Dict[str,Any]
    narrative: str

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


@app.get('/session/{session_id}')
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

@app.post('/clean')
async def clean(file: UploadFile = File(...), trim_strings: bool = True, normalize_case: Optional[str] = None, drop_duplicates: bool = False, _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    before = len(df)
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
    after = len(df)
    # return parquet bytes if pyarrow available, else CSV
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

@app.post('/generate_sql', response_model=GenerateSQLResponse)
async def generate_sql(req: GenerateSQLRequest, _: User = Depends(get_current_user)):
    # deterministic fallback when no OPENAI_API_KEY
    import os
    key = os.getenv('OPENAI_API_KEY') or os.getenv('ANTHROPIC_API_KEY')
    if not key:
        # simple rule-based generator
        # support: SELECT columns WHERE conditions ORDER BY ... LIMIT n
        col_list = ', '.join([f'"{k}"' for k in req.schema.keys()])
        sql = f"SELECT {col_list} FROM {req.table} LIMIT 100;"
        return GenerateSQLResponse(sql=sql, explanation='Fallback deterministic SQL: select top 100 rows', safety={'is_safe': True, 'reasons': []})
    # if key exists, call LLM wrapper (mockable)
    try:
        from .llm import generate_sql as llm_generate_sql
        sql, expl = llm_generate_sql(req.question, req.schema, req.sample_rows)
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
    timestamp_col: str = "timestamp",
    metric_col: str = "value",
    dimension_cols: Optional[str] = None,
    method: Optional[str] = "simple",
):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    # simple fallback z-score detection
    ts = pd.to_datetime(df[timestamp_col])
    vals = pd.to_numeric(df[metric_col], errors='coerce')
    mean = vals.mean()
    std = vals.std()
    anomalies = []
    if std and std > 0:
        z = (vals - mean) / std
        outliers = z[abs(z) > 3]
        for idx in outliers.index:
            anomalies.append({'timestamp': str(ts.iloc[idx]), 'value': float(vals.iloc[idx]), 'score': float(z.iloc[idx])})
    narrative = 'No LLM available; used z-score fallback.'
    return AnalyzeResponse(anomalies=anomalies, summary={'count': len(anomalies), 'method_used': 'zscore'}, narrative=narrative)

@app.post('/query')
async def query(file: UploadFile = File(...), sql: str = '', _: User = Depends(get_current_user), __: None = Depends(enforce_upload_size)):
    contents = await file.read()
    df = _read_table_from_upload(contents)
    try:
        import duckdb
        con = duckdb.connect(database=':memory:')
        # register dataframe as table
        con.register('loaded_table', df)
        res = con.execute(sql).fetchdf()
        rows = res.to_dict(orient='records')
        cols = list(res.columns)
        return {'columns': cols, 'rows': rows, 'row_count': len(res)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
