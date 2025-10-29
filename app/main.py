from fastapi import FastAPI, UploadFile, File, Body, Form
import pandas as pd
from io import BytesIO
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import os
import openai
from datetime import datetime

# Optional PyCatcher import for time-series anomaly detection
try:
    from pycatcher import outlier_detection_functions as pc  # type: ignore
except Exception:
    pc = None  # gracefully degrade if not installed

app = FastAPI(title="Databotics")

class ValidateRequest(BaseModel):
    rules: Dict[str, Any] = {}

class SQLGenerateRequest(BaseModel):
    question: str
    tables: Dict[str, Dict[str, str]] = {}

@app.post("/profile")
async def profile(file: UploadFile = File(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx", "xls")) else pd.read_csv(BytesIO(raw))
    profile = {
        "rows": len(df),
        "cols": df.shape[1],
        "columns": {c: str(df[c].dtype) for c in df.columns},
        "null_counts": df.isna().sum().to_dict(),
        "sample": df.head(20).to_dict(orient="records")
    }
    return {"profile": profile}

@app.post("/validate")
async def validate(file: UploadFile = File(...), req: ValidateRequest = Body(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx", "xls")) else pd.read_csv(BytesIO(raw))
    issues: List[Dict[str, Any]] = []
    rules = req.rules or {}
    required = rules.get("required", [])
    for col in required:
        if col not in df.columns:
            issues.append({"type": "missing_column", "column": col})
    uniques = rules.get("unique", [])
    for col in uniques:
        if col in df.columns and df[col].duplicated().any():
            dups = df[df[col].duplicated()][col].tolist()[:20]
            issues.append({"type": "duplicate_values", "column": col, "examples": dups})
    return {"ok": len(issues) == 0, "issues": issues}

@app.post("/clean")
async def clean(file: UploadFile = File(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx", "xls")) else pd.read_csv(BytesIO(raw))
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    buf = BytesIO()
    df.to_parquet(buf, index=False)
    buf.seek(0)
    return {"format": "parquet_hex", "data": buf.getvalue().hex()}

@app.post("/generate_sql")
async def generate_sql(req: SQLGenerateRequest):
    table_info = ""
    for table_name, cols in req.tables.items():
        cols_list = [f"{name} {dtype}" for name, dtype in cols.items()]
        table_info += f"Table {table_name} columns: {', '.join(cols_list)}.\n"
    prompt = f"Generate a SQL query for the following request:\n{req.question}\n\n{table_info}"
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OPENAI_API_KEY environment variable not set."}
    openai.api_key = api_key
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that writes SQL queries."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            n=1,
            stop=None,
            temperature=0.2,
        )
        sql = response.choices[0].message.content.strip()
        return {"sql": sql}
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    date_col: Optional[str] = Form(None),
    value_col: Optional[str] = Form(None),
    method: Optional[str] = Form(None),  # classic|stl|mstl|esd|iqr|moving_average|auto
    freq: Optional[str] = Form(None),    # D|W|M|Q (optional hint)
):
    """Detect anomalies using PyCatcher when possible and summarize with AI.

    Accepts a file upload and optional form fields: date_col, value_col, method, freq.
    """
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx", "xls")) else pd.read_csv(BytesIO(raw))

    # Attempt column inference if not provided
    def infer_date_col(frame: pd.DataFrame) -> Optional[str]:
        for c in frame.columns:
            if pd.api.types.is_datetime64_any_dtype(frame[c]):
                return c
        candidates = ["date", "timestamp", "time", "datetime", "ds", "day", "month", "year"]
        for name in candidates:
            for c in frame.columns:
                if c.lower() == name:
                    try:
                        frame[c] = pd.to_datetime(frame[c], errors="raise")
                        return c
                    except Exception:
                        pass
        for c in frame.columns:
            try:
                parsed = pd.to_datetime(frame[c], errors="coerce")
                if parsed.notna().mean() > 0.7:
                    frame[c] = parsed
                    return c
            except Exception:
                continue
        return None

    def infer_value_col(frame: pd.DataFrame) -> Optional[str]:
        nums = [c for c in frame.columns if pd.api.types.is_numeric_dtype(frame[c])]
        if nums:
            return nums[-1]
        return None

    dcol = date_col or infer_date_col(df.copy())
    vcol = value_col or infer_value_col(df)

    anomalies: List[Dict[str, Any]] = []
    used_pycatcher = False
    chosen_method = (method or "auto").lower()
    error: Optional[str] = None

    ts_df = None
    if dcol and vcol and dcol in df.columns and vcol in df.columns:
        ts_df = df[[dcol, vcol]].dropna().copy()
        try:
            ts_df[dcol] = pd.to_datetime(ts_df[dcol], errors="coerce")
        except Exception:
            pass
        ts_df = ts_df.dropna(subset=[dcol]).sort_values(by=dcol)

    if pc is not None and ts_df is not None and ts_df.shape[0] >= 8:
        try:
            df_pc = ts_df.copy()
            df_pc = df_pc[[dcol, vcol]]
            df_pc.columns = [dcol, vcol]

            def run_pc(m: str, frame: pd.DataFrame):
                m = m.lower()
                if m == "classic":
                    return pc.detect_outliers_classic(frame)
                if m == "stl":
                    return pc.detect_outliers_stl(frame)
                if m == "mstl":
                    return pc.detect_outliers_mstl(frame)
                if m == "esd":
                    return pc.detect_outliers_esd(frame)
                if m == "moving_average":
                    return pc.detect_outliers_moving_average(frame)
                if m == "iqr":
                    return pc.find_outliers_iqr(frame)
                try:
                    return pc.detect_outliers_stl(frame)
                except Exception:
                    return pc.find_outliers_iqr(frame)

            out = run_pc(chosen_method, df_pc)
            if isinstance(out, pd.DataFrame) and not out.empty:
                for _, r in out.iterrows():
                    anomalies.append({
                        "date": r.get(dcol, None),
                        "value": r.get(vcol, None),
                        "row": {k: (r[k].isoformat() if isinstance(r[k], (pd.Timestamp, datetime)) else r[k]) for k in out.columns}
                    })
            used_pycatcher = True
        except Exception as e:
            error = f"pycatcher_error: {e}"

    # AI summary using OpenAI
    ai_summary: Optional[str] = None
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        openai.api_key = api_key
        try:
            sample = df.sample(min(50, len(df)))
            sample_csv = sample.to_csv(index=False)
            anomalies_preview = anomalies[:20]
            context = {
                "shape": list(df.shape),
                "columns": {c: str(df[c].dtype) for c in df.columns},
                "date_col": dcol,
                "value_col": vcol,
                "anomalies_count": len(anomalies),
                "anomalies_preview": anomalies_preview,
            }
            prompt = (
                "You are a data analyst. Given the sample data and any detected anomalies, "
                "summarize the most likely issues, potential root causes, and next steps. "
                "Be concise and return bullet points.\n\n"
                f"Sample (CSV):\n{sample_csv}\n\n"
                f"Context: {context}"
            )
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes data."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=350,
                n=1,
                temperature=0.3,
            )
            ai_summary = response.choices[0].message.content.strip()
        except Exception as e:
            ai_summary = f"OpenAI error: {e}"
    else:
        ai_summary = "Set OPENAI_API_KEY to enable AI summary."

    return {
        "used_pycatcher": used_pycatcher,
        "date_col": dcol,
        "value_col": vcol,
        "method": chosen_method,
        "anomalies": anomalies,
        "analysis": ai_summary,
        **({"error": error} if error else {}),
    }
