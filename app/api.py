from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import pandas as pd
from .validation import load_rules, validate_dataframe
import io

app = FastAPI()

@app.post('/validate')
async def validate(file: UploadFile = File(...), rules_path: str = 'rules/basic.yaml'):
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            return JSONResponse({'error': str(e)}, status_code=400)
    rules = load_rules(rules_path)
    report = validate_dataframe(df, rules)
    return report
