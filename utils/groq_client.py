"""Shared Groq API client with exponential backoff, 429 retry, and response caching."""

import hashlib
import json
import time
from pathlib import Path
from typing import Optional

from utils.config import GROQ_API_KEY, NUTRITION_CACHE_PATH
from utils.storage import read_json, write_json

_client = None


def _get_client():
    global _client
    if _client is None:
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set")
        from groq import Groq
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def _cache_key(messages: list, model: str) -> str:
    payload = json.dumps({"model": model, "messages": messages}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def chat(
    messages: list,
    model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: int = 600,
    temperature: float = 0.1,
    use_cache: bool = True,
    cache_path: Optional[Path] = None,
) -> str:
    """
    Send a Groq chat completion with optional caching and exponential backoff on 429.

    Returns the response content string.
    """
    cache_file = cache_path or NUTRITION_CACHE_PATH
    key = _cache_key(messages, model)

    if use_cache:
        cache = read_json(cache_file) or {}
        if key in cache:
            return cache[key]

    client = _get_client()
    max_retries = 4
    base_delay = 2.0

    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = resp.choices[0].message.content.strip()

            if use_cache:
                cache = read_json(cache_file) or {}
                cache[key] = content
                write_json(cache_file, cache)

            return content

        except Exception as exc:
            exc_str = str(exc).lower()
            is_rate_limit = "429" in exc_str or "rate limit" in exc_str or "rate_limit" in exc_str
            if is_rate_limit and attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
            else:
                raise
