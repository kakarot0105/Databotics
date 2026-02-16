"""LLM adapter for Databotics.
Supports NVIDIA NIM/Kimi (via NIM API key) and deterministic fallback.
All network calls are centralized here so tests can mock these functions.
"""
from typing import Dict, Any, List, Tuple
import os
import requests

NIM_API_KEY_ENV = "NIM_API_KEY"  # or use NVIDIA_API_KEY
NIM_API_URL = os.getenv("NIM_API_URL", "https://api.nvidia.com/v1/messages")


def _nim_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    key = os.getenv(NIM_API_KEY_ENV) or os.getenv("NVIDIA_API_KEY")
    if not key:
        raise RuntimeError("No NIM API key configured")
    headers = {
        "x-api-key": key,
        "Content-Type": "application/json",
    }
    resp = requests.post(NIM_API_URL, json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def generate_sql(question: str, schema: Dict[str, str], sample_rows: List[Dict[str, Any]] | None = None) -> Tuple[str, str]:
    """Generate SQL using LLM or deterministic fallback.
    Returns (sql, explanation)
    """
    # If NIM key available, call Kimi/NIM
    try:
        key = os.getenv(NIM_API_KEY_ENV) or os.getenv("NVIDIA_API_KEY")
        if key:
            # build a simple messages payload using NIM messages API
            # model selection is left to the NIM service; using a safe prompt
            prompt = f"Generate a safe, non-destructive SQL query for this request:\nQuestion: {question}\nSchema: {schema}\nReturn only the SQL and a short explanation."
            payload = {
                "model": os.getenv("NIM_MODEL", "moonshotai/kimi-k2-5"),
                "messages": [{"role": "user", "content": prompt},],
                "max_tokens": 512,
            }
            data = _nim_request(payload)
            # NIM response shape may vary; attempt to extract text
            if isinstance(data, dict):
                # try common places
                if "content" in data:
                    text = data["content"]
                elif "choices" in data and len(data["choices"]) > 0:
                    text = data["choices"][0].get("message", {}).get("content", "")
                else:
                    # fallback: stringify
                    text = str(data)
            else:
                text = str(data)
            # attempt to split SQL and explanation heuristically
            parts = text.split("\n\n", 1)
            sql = parts[0].strip()
            explanation = parts[1].strip() if len(parts) > 1 else ""
            return sql, explanation
    except Exception:
        # any error uses fallback
        pass

    # Deterministic fallback: simple SELECT top 100
    col_list = ', '.join([f'"{c}"' for c in schema.keys()]) if schema else "*"
    sql = f"SELECT {col_list} FROM {schema.get('__table','data') if schema else 'data'} LIMIT 100;"
    explanation = "Deterministic fallback SQL: select top 100 rows from the requested table."
    return sql, explanation


def analyze_narrative(summary: Dict[str, Any]) -> str:
    """Return a short narrative about analysis results using LLM or deterministic fallback."""
    try:
        key = os.getenv(NIM_API_KEY_ENV) or os.getenv("NVIDIA_API_KEY")
        if key:
            prompt = f"Summarize the following analysis results succinctly and provide next steps: {summary}"
            payload = {"model": os.getenv("NIM_MODEL", "moonshotai/kimi-k2-5"), "messages": [{"role": "user", "content": prompt}], "max_tokens": 256}
            data = _nim_request(payload)
            if isinstance(data, dict):
                if "content" in data:
                    return data["content"].strip()
                if "choices" in data and len(data.get("choices", [])) > 0:
                    return data["choices"][0].get("message", {}).get("content", "").strip()
            return str(data)
    except Exception:
        pass
    # Deterministic fallback:
    cnt = summary.get("count", 0)
    method = summary.get("method_used", "unknown")
    return f"Analysis used method={method}. Found {cnt} anomalies. Inspect flagged points for root cause."
