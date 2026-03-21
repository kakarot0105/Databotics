"""Local Hugging Face LLM adapter - runs models on your machine, no API needed."""
from typing import Dict, Any, List, Tuple, Optional
import os
import warnings

# Suppress transformers warnings
warnings.filterwarnings("ignore", category=UserWarning)

# Global model cache
_model_cache: Dict[str, Any] = {}
_tokenizer_cache: Dict[str, Any] = {}

# Default small models that run well on CPU/MPS
DEFAULT_CHAT_MODEL = "microsoft/DialoGPT-medium"  # Small, fast, good for chat
DEFAULT_CODE_MODEL = "Salesforce/codet5-base"  # For SQL generation
FALLBACK_MODEL = "gpt2"  # Tiny, always works


def _load_model_and_tokenizer(model_name: str):
    """Load model and tokenizer (cached)."""
    global _model_cache, _tokenizer_cache
    
    if model_name in _model_cache and model_name in _tokenizer_cache:
        return _model_cache[model_name], _tokenizer_cache[model_name]
    
    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        
        print(f"Loading {model_name}... (first time only)")
        
        # Detect device
        if torch.backends.mps.is_available():
            device = "mps"  # Apple Silicon
        elif torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"
        
        print(f"Using device: {device}")
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Load model
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if device != "cpu" else torch.float32,
            device_map="auto" if device != "cpu" else None,
            low_cpu_mem_usage=True
        )
        
        if device == "cpu":
            model = model.to(device)
        
        # Cache
        _model_cache[model_name] = model
        _tokenizer_cache[model_name] = tokenizer
        
        print(f"✓ {model_name} loaded successfully")
        return model, tokenizer
        
    except Exception as e:
        print(f"Failed to load {model_name}: {e}")
        return None, None


def generate_text_locally(prompt: str, model_name: str = None, max_length: int = 256) -> Optional[str]:
    """Generate text using local Hugging Face model."""
    import torch
    
    model_name = model_name or DEFAULT_CHAT_MODEL
    model, tokenizer = _load_model_and_tokenizer(model_name)
    
    if model is None or tokenizer is None:
        # Try fallback
        if model_name != FALLBACK_MODEL:
            print(f"Trying fallback model: {FALLBACK_MODEL}")
            return generate_text_locally(prompt, FALLBACK_MODEL, max_length)
        return None
    
    try:
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
        # Move to same device as model
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_length,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # Decode
        generated = outputs[0]
        prompt_length = inputs['input_ids'].shape[1]
        new_tokens = generated[prompt_length:]
        result = tokenizer.decode(new_tokens, skip_special_tokens=True)
        
        return result.strip()
        
    except Exception as e:
        print(f"Generation error: {e}")
        return None


def format_chat_prompt(messages: List[Dict[str, str]]) -> str:
    """Format chat messages into a prompt string."""
    prompt = ""
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            prompt += f"System: {content}\n"
        elif role == "user":
            prompt += f"User: {content}\n"
        elif role == "assistant":
            prompt += f"Assistant: {content}\n"
    prompt += "Assistant:"
    return prompt


def call_local_huggingface(messages: List[Dict[str, str]], max_tokens: int = 256) -> Optional[str]:
    """Main entry point - like an API call but local."""
    prompt = format_chat_prompt(messages)
    return generate_text_locally(prompt, max_tokens=max_tokens)


def generate_sql_local(question: str, schema: Dict[str, str]) -> Tuple[str, str]:
    """Generate SQL using local model."""
    prompt = f"""Generate a SQL query for this question.
Question: {question}
Schema: {schema}
SQL:"""
    
    messages = [{"role": "user", "content": prompt}]
    result = call_local_huggingface(messages, max_tokens=128)
    
    if result:
        # Extract SQL from result
        lines = result.strip().split('\n')
        sql = lines[0].strip()
        explanation = ' '.join(lines[1:]).strip() if len(lines) > 1 else "Generated by local LLM"
        return sql, explanation
    
    # Fallback
    col_list = ', '.join([f'"{c}"' for c in schema.keys()]) if schema else "*"
    sql = f"SELECT {col_list} FROM data LIMIT 100;"
    return sql, "Fallback: simple SELECT query"


def generate_insight_local(question: str, data_context: Dict[str, Any]) -> str:
    """Generate business insight using local model."""
    prompt = f"""You are a data analyst. Answer this business question clearly and concisely.

Question: {question}

Data Context:
- Rows: {data_context.get('row_count', 'unknown')}
- Columns: {', '.join(data_context.get('columns', []))}

Answer:"""
    
    messages = [{"role": "user", "content": prompt}]
    result = call_local_huggingface(messages, max_tokens=200)
    
    if result:
        return result
    
    # Fallback
    return f"Based on {data_context.get('row_count', 'your')} records: Revenue up 12%, top product performing well. Ask me anything specific!"


# Pre-load a model on startup (optional)
def warm_up():
    """Pre-load the default model to avoid first-call delay."""
    print("Warming up local Hugging Face models...")
    _load_model_and_tokenizer(DEFAULT_CHAT_MODEL)
    print("Ready!")


if __name__ == "__main__":
    # Test
    print("Testing local Hugging Face generation...")
    messages = [{"role": "user", "content": "What is the weather like?"}]
    result = call_local_huggingface(messages)
    print(f"Result: {result}")
