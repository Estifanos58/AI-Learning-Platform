"""Usage – token counting and cost estimation with model-specific pricing and provider usage."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

log = logging.getLogger(__name__)

# Provider default pricing per 1K tokens (USD)
_COST_PER_1K: Dict[str, Dict[str, float]] = {
    "openai": {"prompt": 0.0015, "completion": 0.002},
    "gemini": {"prompt": 0.00025, "completion": 0.0005},
    "openrouter": {"prompt": 0.0010, "completion": 0.0020},
    "groq": {"prompt": 0.0005, "completion": 0.0008},
    "deepseek": {"prompt": 0.0014, "completion": 0.0028},
    "anthropic": {"prompt": 0.003, "completion": 0.015},
    "local": {"prompt": 0.0, "completion": 0.0},
}

# Fine-grained model-specific pricing per 1K tokens (USD)
_MODEL_PRICING_PER_1K: Dict[str, Dict[str, float]] = {
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-4o": {"prompt": 0.0025, "completion": 0.010},
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    "gemini-2.5-flash": {"prompt": 0.000075, "completion": 0.0003},
    "gemini-2.5-pro": {"prompt": 0.00125, "completion": 0.005},
    "gemini-3.8-flash": {"prompt": 0.0001, "completion": 0.0004},
    "gemini-2.0-flash": {"prompt": 0.0001, "completion": 0.0004},
    "gemini-1.5-flash": {"prompt": 0.000075, "completion": 0.0003},
    "gemini-1.5-pro": {"prompt": 0.00125, "completion": 0.005},
    "deepseek-chat": {"prompt": 0.00014, "completion": 0.00028},
    "deepseek-v3": {"prompt": 0.00014, "completion": 0.00028},
    "deepseek-reasoner": {"prompt": 0.00055, "completion": 0.00219},
    "deepseek-r1": {"prompt": 0.00055, "completion": 0.00219},
    "llama-3.3-70b": {"prompt": 0.00059, "completion": 0.00079},
    "llama-3.1-70b": {"prompt": 0.00059, "completion": 0.00079},
    "llama-3.1-8b": {"prompt": 0.00005, "completion": 0.00008},
    "mixtral-8x7b": {"prompt": 0.00024, "completion": 0.00024},
    "claude-3-5-sonnet": {"prompt": 0.003, "completion": 0.015},
    "claude-3-haiku": {"prompt": 0.00025, "completion": 0.00125},
}


class TokenMeter:
    """Estimates token usage and cost for a request/response pair."""

    async def estimate(
        self,
        prompt: str,
        completion: str,
        model_id: str,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        provider_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        p_tokens = (
            prompt_tokens
            if (prompt_tokens is not None and prompt_tokens > 0)
            else self._count_tokens(prompt)
        )
        c_tokens = (
            completion_tokens
            if (completion_tokens is not None and completion_tokens > 0)
            else self._count_tokens(completion)
        )
        total_tokens = p_tokens + c_tokens
        cost = self._estimate_cost(p_tokens, c_tokens, model_id, provider_name=provider_name)

        return {
            "prompt_tokens": p_tokens,
            "completion_tokens": c_tokens,
            "total_tokens": total_tokens,
            "cost_estimate": round(cost, 6),
            "model_id": model_id,
            "provider_name": provider_name or "",
            "provider_reported": bool(prompt_tokens is not None and prompt_tokens > 0),
        }

    def _count_tokens(self, text: str) -> int:
        """Rough approximation: 1 token ≈ 4 characters (GPT tokenisation rule of thumb)."""
        try:
            import tiktoken  # type: ignore[import]

            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except Exception:  # noqa: BLE001
            return max(1, len(text) // 4)

    def _estimate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model_id: str,
        provider_name: Optional[str] = None,
    ) -> float:
        m = (model_id or "").lower()

        # Check model-specific pricing first
        for model_key, rates in _MODEL_PRICING_PER_1K.items():
            if model_key in m:
                return (prompt_tokens / 1000) * rates["prompt"] + (
                    completion_tokens / 1000
                ) * rates["completion"]

        # Fallback to provider-level pricing
        provider = (provider_name or "").lower()
        if not provider:
            if "gemini" in m:
                provider = "gemini"
            elif "openrouter" in m or "open-router" in m or "/" in m:
                provider = "openrouter"
            elif "groq" in m:
                provider = "groq"
            elif "deepseek" in m:
                provider = "deepseek"
            elif "claude" in m or "anthropic" in m:
                provider = "anthropic"
            elif "local" in m or "ollama" in m or "mistral" in m:
                provider = "local"
            else:
                provider = "openai"

        rates = _COST_PER_1K.get(provider, _COST_PER_1K["openai"])
        return (prompt_tokens / 1000) * rates["prompt"] + (
            completion_tokens / 1000
        ) * rates["completion"]
