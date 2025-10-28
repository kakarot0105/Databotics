from fastapi import FastAPI, UploadFile, File, Body
import pandas as pd
from io import BytesIO
from typing import Dict, Any, List
from pydantic import BaseModel
import os
import openai

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
async def analyze(file: UploadFile = File(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx", "xls")) else pd.read_csv(BytesIO(raw))

    sample = df.sample(min(50, len(df)))
    sample_csv = sample.to_csv(index=False)

    prompt = f"""You are a data analyst. Find anomalies in the following data sample:

{sample_csv}

Anomalies can include outliers, unexpected values, strange patterns, or anything that seems unusual. Present your findings as a list of strings in your response."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OPENAI_API_KEY environment variable not set."}
    openai.api_key = api_key

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes data."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            n=1,
            stop=None,
            temperature=0.3,
        )
        analysis = response.choices[0].message.content.strip()
        return {"analysis": analysis}
    except Exception as e:
        return {"error": str(e)}
