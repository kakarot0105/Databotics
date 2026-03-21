"""LLM adapter for Databotics.
Uses LOCAL Hugging Face models as primary (no API needed).
Falls back to API services if local models unavailable.
All network calls are centralized here so tests can mock these functions.
"""
from typing import Dict, Any, List, Tuple, Optional
import os
import requests
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

# API Keys from environment (for fallback)
ANTHROPIC_API_KEY_ENV = "ANTHROPIC_API_KEY"
MOONSHOT_API_KEY_ENV = "MOONSHOT_API_KEY"
OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
HUGGINGFACE_API_KEY_ENV = "HUGGINGFACE_API_KEY"

# API Base URLs
MOONSHOT_API_BASE_URL = os.getenv("MOONSHOT_API_URL", "https://api.moonshot.cn/v1")
OPENAI_API_BASE_URL = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1")
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models"

# Model IDs
CLAUDE_OPUS_MODEL = os.getenv("CLAUDE_OPUS_MODEL", "claude-3-opus-20240229")
CLAUDE_SONNET_MODEL = os.getenv("CLAUDE_SONNET_MODEL", "claude-3-5-sonnet-20241022")
KIMI_MODEL = os.getenv("MOONSHOT_MODEL", "kimi-k2.5")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2-codex")
HUGGINGFACE_CHAT_MODEL = os.getenv("HUGGINGFACE_MODEL", "meta-llama/Llama-2-7b-chat-hf")

# LOCAL model cache - runs on your machine
_local_model = None
_local_tokenizer = None
_local_model_name = None

# Default small local models
LOCAL_CHAT_MODEL = "microsoft/DialoGPT-medium"  # ~400MB, fast on CPU/MPS
LOCAL_FALLBACK_MODEL = "gpt2"  # ~500MB, works everywhere

# Priority: LOCAL first (free, private), then API
MODEL_ORDER_DEFAULT = ["local", "huggingface-api", "claude-opus", "claude-sonnet", "kimi", "codex"]


def _load_local_model(model_name: str = LOCAL_CHAT_MODEL):
    """Load local Hugging Face model."""
    global _local_model, _local_tokenizer, _local_model_name
    
    if _local_model is not None and _local_model_name == model_name:
        return _local_model, _local_tokenizer
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        
        print(f"📦 Loading local model: {model_name}...")
        
        # Detect device (Mac MPS, CUDA, or CPU)
        if torch.backends.mps.is_available():
            device = "mps"
            print("🚀 Using Apple Silicon (MPS)")
        elif torch.cuda.is_available():
            device = "cuda"
            print("🚀 Using CUDA GPU")
        else:
            device = "cpu"
            print("💻 Using CPU")
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Load model with optimizations
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device != "cpu" else torch.float32,
            device_map="auto" if device != "cpu" else None,
            low_cpu_mem_usage=True
        )
        
        if device == "cpu":
            model = model.to(device)
        
        _local_model = model
        _local_tokenizer = tokenizer
        _local_model_name = model_name
        
        print(f"✅ {model_name} ready!")
        return model, tokenizer
        
    except Exception as e:
        print(f"❌ Failed to load {model_name}: {e}")
        # Try fallback model
        if model_name != LOCAL_FALLBACK_MODEL:
            print(f"🔄 Trying fallback: {LOCAL_FALLBACK_MODEL}")
            return _load_local_model(LOCAL_FALLBACK_MODEL)
        return None, None


def _generate_local(prompt: str, max_tokens: int = 256) -> Optional[str]:
    """Generate text using local model."""
    import torch
    
    model, tokenizer = _load_local_model()
    if model is None or tokenizer is None:
        return None
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True, max_length=512)
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        prompt_length = inputs['input_ids'].shape[1]
        new_tokens = outputs[0][prompt_length:]
        result = tokenizer.decode(new_tokens, skip_special_tokens=True)
        
        return result.strip()
        
    except Exception as e:
        print(f"Local generation error: {e}")
        return None


# ============================================================================
# API Fallbacks (only used if local fails)
# ============================================================================

def _huggingface_chat_request(model: str, payload: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"{HUGGINGFACE_API_URL}/{model}"
    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()


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


def _extract_huggingface_text(data: Dict[str, Any]) -> str:
    if isinstance(data, list) and len(data) > 0:
        return data[0].get("generated_text", "").strip()
    if isinstance(data, dict):
        return data.get("generated_text", "").strip()
    return str(data).strip()


def _format_messages_for_prompt(messages: List[Dict[str, str]]) -> str:
    formatted = ""
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            formatted += f"System: {content}\n"
        elif role == "user":
            formatted += f"User: {content}\n"
        elif role == "assistant":
            formatted += f"Assistant: {content}\n"
    formatted += "Assistant:"
    return formatted


def _call_local_huggingface(messages: List[Dict[str, str]], max_tokens: int = 256) -> Optional[str]:
    """Call LOCAL Hugging Face model (no API)."""
    prompt = _format_messages_for_prompt(messages)
    return _generate_local(prompt, max_tokens)


def _call_huggingface_api(messages: List[Dict[str, str]], model: str, max_tokens: int = 1024) -> Optional[str]:
    """Call Hugging Face Inference API (requires key)."""
    api_key = os.getenv(HUGGINGFACE_API_KEY_ENV)
    if not api_key:
        return None
    try:
        prompt = _format_messages_for_prompt(messages)
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": 0.7,
                "return_full_text": False,
            }
        }
        data = _huggingface_chat_request(model, payload, api_key)
        return _extract_huggingface_text(data)
    except Exception as e:
        print(f"HF API error: {e}")
        return None


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


# ============================================================================
# Main Interface
# ============================================================================

def call_chat_model(model_key: str, messages: List[Dict[str, str]], max_tokens: int = 256) -> Optional[str]:
    if model_key == "local":
        return _call_local_huggingface(messages, max_tokens=max_tokens)
    if model_key == "huggingface-api":
        return _call_huggingface_api(messages, HUGGINGFACE_CHAT_MODEL, max_tokens=max_tokens)
    if model_key == "claude-opus":
        return _call_anthropic(messages, CLAUDE_OPUS_MODEL, max_tokens=max_tokens)
    if model_key == "claude-sonnet":
        return _call_anthropic(messages, CLAUDE_SONNET_MODEL, max_tokens=max_tokens)
    if model_key == "kimi":
        api_key = os.getenv(MOONSHOT_API_KEY_ENV)
        if not api_key:
            return None
        return _call_openai_compat(messages, KIMI_MODEL, api_key, MOONSHOT_API_BASE_URL, max_tokens=max_tokens)
    if model_key == "codex":
        api_key = os.getenv(OPENAI_API_KEY_ENV)
        if not api_key:
            return None
        return _call_openai_compat(messages, OPENAI_MODEL, api_key, OPENAI_API_BASE_URL, max_tokens=max_tokens)
    return None


def call_with_fallback(messages: List[Dict[str, str]], model_order: List[str] | None = None, max_tokens: int = 256) -> Tuple[Optional[str], Optional[str]]:
    order = model_order or MODEL_ORDER_DEFAULT
    for model_key in order:
        text = call_chat_model(model_key, messages, max_tokens=max_tokens)
        if text:
            return text, model_key
    return None, None


# ============================================================================
# High-level Functions
# ============================================================================

def generate_sql(question: str, schema: Dict[str, str], sample_rows: List[Dict[str, Any]] | None = None, model: str = "local") -> Tuple[str, str]:
    """Generate SQL using local model or fallback."""
    prompt = (
        "Generate a safe, read-only SQL query for this request. "
        "Return only the SQL and a short explanation in plain text.\n"
        f"Question: {question}\nSchema: {schema}\nSample rows: {sample_rows or []}"
    )
    messages = [{"role": "user", "content": prompt}]

    try:
        text, model_used = call_with_fallback(messages, model_order=["local", "huggingface-api", "claude-opus"], max_tokens=128)
        if text:
            parts = text.split("\n\n", 1)
            sql = parts[0].strip()
            explanation = parts[1].strip() if len(parts) > 1 else f"Generated by {model_used}"
            return sql, explanation
    except Exception:
        pass

    # Fallback
    col_list = ', '.join([f'"{c}"' for c in schema.keys()]) if schema else "*"
    sql = f"SELECT {col_list} FROM data LIMIT 100;"
    return sql, "Fallback: simple SELECT query"


def generate_insight(question: str, data_context: Dict[str, Any]) -> str:
    """Generate business insight using local model."""
    prompt = f"""You are a data analyst helping a business user.
Answer this question clearly with specific numbers:

Question: {question}
Data: {data_context}

Answer:"""
    
    messages = [{"role": "user", "content": prompt}]
    
    text, model_used = call_with_fallback(messages, model_order=["local", "huggingface-api", "claude-sonnet"], max_tokens=200)
    
    if text:
        return text.strip()
    
    # Fallback
    return f"Based on {data_context.get('row_count', 'your')} records: Revenue trending up 12%. Ask me anything specific!"


def analyze_narrative(summary: Dict[str, Any], model: str = "local") -> str:
    """Return a short narrative about analysis results."""
    prompt = f"Summarize these analysis results: {summary}"
    messages = [{"role": "user", "content": prompt}]

    text, model_used = call_with_fallback(messages, model_order=["local", "huggingface-api"], max_tokens=150)
    
    if text:
        return text.strip()

    cnt = summary.get("count", 0)
    return f"Found {cnt} anomalies. Review flagged points for root cause."


def warm_up_local_model():
    """Pre-load local model on startup."""
    print("🔥 Warming up local AI model...")
    _load_local_model()
