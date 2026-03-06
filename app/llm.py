"""LLM adapter for Databotics.
Supports Claude, Moonshot Kimi (OpenAI-compatible), and OpenAI fallback.
All network calls are centralized here so tests can mock these functions.
"""
from typing import Dict, Any, List, Tuple, Optional
import os
import requests

ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"
MOONSHOT_API_KEY_ENV = "MOONSHOT_API_KEY"
OPENAI_API_KEY_ENV = "OPENAI_API_KEY"

MOONSHOT_API_BASE_URL = os.getenv("MOONSHOT_API_URL", "https://api.moonshot.cn/v1")
OPENAI_API_BASE_URL = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1")

CLAUDE_OPUS_MODEL = os.getenv("CLAUDE_OPUS_MODEL", "claude-3-opus-20240229")
CLAUDE_SONNET_MODEL = os.getenv("CLAUDE_SONNET_MODEL", "claude-3-5-sonnet-20241022")
KIMI_MODEL = os.getenv("MOONSHOT_MODEL", "kimi-k2.5")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2-codex")

MODEL_ORDER_DEFAULT = ["claude-opus", "claude-sonnet", "kimi", "codex"]


def _openai_chat_request(base_url: str, api_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    resp = requests.post(f"{base_url}/chat/completions", json=payload, headers=headers, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _extract_openai_text(data: Dict[str, Any]) -> str:
    if "choices" in data and data["choices"]:
        return data["choices"][0].get("message", {}).get("content", "").strip()
    if "content" in data:
        return str(data["content"]).strip()
    return str(data).strip()


def _call_anthropic(messages: List[Dict[str, str]], model: str, max_tokens: int = 1024) -> Optional[str]:
    api_key = os.getenv(ANTHROPIC_API_KEY_ENV)
    if not api_key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
        )
        return response.content[0].text
    except Exception:
        return None


def _call_openai_compat(messages: List[Dict[str, str]], model: str, api_key: str, base_url: str, max_tokens: int = 1024) -> Optional[str]:
    try:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        data = _openai_chat_request(base_url, api_key, payload)
        return _extract_openai_text(data)
    except Exception:
        return None


def call_chat_model(model_key: str, messages: List[Dict[str, str]], max_tokens: int = 1024) -> Optional[str]:
    if model_key == "claude-opus":
        return _call_anthropic(messages, CLAUDE_OPUS_MODEL, max_tokens=max_tokens)
    if model_key == "claude-sonnet":
        return _call_anthropic(messages, CLAUDE_SONNET_MODEL, max_tokens=max_tokens)
    if model_key == "kimi":
        api_key = os.getenv(MOONSHOT_API_KEY_ENV, "sk-HWY2SqKo8KxZr6gMYIAYCyeb8YzQit65nL6lRs8hgg4xSbH2")
        if not api_key:
            return None
        return _call_openai_compat(messages, KIMI_MODEL, api_key, MOONSHOT_API_BASE_URL, max_tokens=max_tokens)
    if model_key == "codex":
        api_key = os.getenv(OPENAI_API_KEY_ENV)
        if not api_key:
            return None
        return _call_openai_compat(messages, OPENAI_MODEL, api_key, OPENAI_API_BASE_URL, max_tokens=max_tokens)
    return None


def call_with_fallback(messages: List[Dict[str, str]], model_order: List[str] | None = None, max_tokens: int = 1024) -> Tuple[Optional[str], Optional[str]]:
    order = model_order or MODEL_ORDER_DEFAULT
    for model_key in order:
        text = call_chat_model(model_key, messages, max_tokens=max_tokens)
        if text:
            return text, model_key
    return None, None


def generate_sql(question: str, schema: Dict[str, str], sample_rows: List[Dict[str, Any]] | None = None, model: str = "claude") -> Tuple[str, str]:
    """Generate SQL using LLM or deterministic fallback.
    Returns (sql, explanation)
    """
    prompt = (
        "Generate a safe, read-only SQL query for this request. "
        "Return only the SQL and a short explanation in plain text.\n"
        f"Question: {question}\nSchema: {schema}\nSample rows: {sample_rows or []}"
    )
    messages = [{"role": "user", "content": prompt}]

    model_order: List[str]
    if model == "claude":
        model_order = ["claude-opus", "claude-sonnet", "kimi", "codex"]
    elif model == "kimi":
        model_order = ["kimi", "codex"]
    elif model == "codex":
        model_order = ["codex"]
    else:
        model_order = MODEL_ORDER_DEFAULT

    try:
        text, _model_used = call_with_fallback(messages, model_order=model_order, max_tokens=512)
        if text:
            parts = text.split("\n\n", 1)
            sql = parts[0].strip()
            explanation = parts[1].strip() if len(parts) > 1 else ""
            return sql, explanation
    except Exception:
        pass

    # Deterministic fallback: simple SELECT top 100
    col_list = ', '.join([f'"{c}"' for c in schema.keys()]) if schema else "*"
    sql = f"SELECT {col_list} FROM {schema.get('__table','data') if schema else 'data'} LIMIT 100;"
    explanation = "Deterministic fallback SQL: select top 100 rows from the requested table."
    return sql, explanation


def refine_sql(query: str, schema: Dict[str, Any] | None = None, engine: str | None = None, model: str = "claude") -> Tuple[str, str]:
    """Refine/optimize an existing SQL query while preserving intent.
    Returns (sql, explanation)
    """
    prompt = (
        "You are a senior SQL engineer. Rewrite the SQL to be safe, efficient, and idiomatic for the target engine while preserving intent. "
        "Return the SQL first, then a short explanation separated by a blank line.\n"
        f"Engine: {engine or 'generic SQL'}\n"
        f"Schema: {schema or {}}\n"
        f"SQL: {query}"
    )
    messages = [{"role": "user", "content": prompt}]

    model_order: List[str]
    if model == "claude":
        model_order = ["claude-opus", "claude-sonnet", "kimi", "codex"]
    elif model == "kimi":
        model_order = ["kimi", "codex"]
    elif model == "codex":
        model_order = ["codex"]
    else:
        model_order = MODEL_ORDER_DEFAULT

    try:
        text, _model_used = call_with_fallback(messages, model_order=model_order, max_tokens=512)
        if text:
            parts = text.split("\n\n", 1)
            sql = parts[0].strip()
            explanation = parts[1].strip() if len(parts) > 1 else ""
            return sql, explanation
    except Exception:
        pass

    return query, "Deterministic fallback: no AI refinement applied."


def analyze_narrative(summary: Dict[str, Any], model: str = "claude") -> str:
    """Return a short narrative about analysis results using LLM or deterministic fallback."""
    prompt = f"Summarize the following analysis results succinctly and provide next steps: {summary}"
    messages = [{"role": "user", "content": prompt}]

    model_order: List[str]
    if model == "claude":
        model_order = ["claude-opus", "claude-sonnet"]
    elif model == "kimi":
        model_order = ["kimi"]
    elif model == "codex":
        model_order = ["codex"]
    else:
        model_order = MODEL_ORDER_DEFAULT

    text, _model_used = call_with_fallback(messages, model_order=model_order, max_tokens=256)
    if text:
        return text.strip()

    # Deterministic fallback:
    cnt = summary.get("count", 0)
    method = summary.get("method_used", "unknown")
    return f"Analysis used method={method}. Found {cnt} anomalies. Inspect flagged points for root cause."
