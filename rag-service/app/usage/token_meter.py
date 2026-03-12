"""Usage – token counting and cost estimation."""

from __future__ import annotations

import logging
from typing import Any, Dict

log = logging.getLogger(__name__)

# Approximate cost per 1K tokens (USD) – rough defaults, update as needed
_COST_PER_1K: Dict[str, Dict[str, float]] = {
    "openai": {"prompt": 0.0015, "completion": 0.002},
    "gemini": {"prompt": 0.00025, "completion": 0.0005},
    "deepseek": {"prompt": 0.0014, "completion": 0.0028},
    "local": {"prompt": 0.0, "completion": 0.0},
}


class TokenMeter:
    """Estimates token usage and cost for a request/response pair."""

    async def estimate(
        self, prompt: str, completion: str, model_id: str
    ) -> Dict[str, Any]:
        prompt_tokens = self._count_tokens(prompt)
        completion_tokens = self._count_tokens(completion)
        total_tokens = prompt_tokens + completion_tokens
        cost = self._estimate_cost(
            prompt_tokens, completion_tokens, model_id
        )

        return {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost_estimate": round(cost, 6),
            "model_id": model_id,
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
        self, prompt_tokens: int, completion_tokens: int, model_id: str
    ) -> float:
        provider = "openai"
        m = model_id.lower() if model_id else ""
        if "gemini" in m:
            provider = "gemini"
        elif "deepseek" in m:
            provider = "deepseek"
        elif "local" in m or "ollama" in m or "mistral" in m:
            provider = "local"

        rates = _COST_PER_1K.get(provider, _COST_PER_1K["openai"])
        return (prompt_tokens / 1000) * rates["prompt"] + (
            completion_tokens / 1000
        ) * rates["completion"]
