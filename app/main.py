from fastapi import FastAPI, UploadFile, File, Body
import pandas as pd
from io import BytesIO
from typing import Dict, Any
from pydantic import BaseModel

app = FastAPI(title="Data Guardian AI")

class ValidateRequest(BaseModel):
    rules: Dict[str, Any] = {}

@app.post("/profile")
async def profile(file: UploadFile = File(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx","xls")) else pd.read_csv(BytesIO(raw))
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
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx","xls")) else pd.read_csv(BytesIO(raw))
    issues = []
    rules = req.rules or {}
    required = rules.get("required", [])
    for col in required:
        if col not in df.columns:
            issues.append({"type":"missing_column", "column":col})
    uniques = rules.get("unique", [])
    for col in uniques:
        if col in df.columns and df[col].duplicated().any():
            dups = df[df[col].duplicated()][col].tolist()[:20]
            issues.append({"type":"duplicate_values", "column":col, "examples":dups})
    return {"ok": len(issues)==0, "issues": issues}

@app.post("/clean")
async def clean(file: UploadFile = File(...)):
    raw = await file.read()
    df = pd.read_excel(BytesIO(raw)) if file.filename.endswith(("xlsx","xls")) else pd.read_csv(BytesIO(raw))
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
    buf = BytesIO()
    df.to_parquet(buf, index=False)
    buf.seek(0)
    return {"format":"parquet_base64", "data": buf.getvalue().hex()}
