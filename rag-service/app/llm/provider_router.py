"""LLM – Provider router: selects provider from model ID + availability."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from app.llm.base_provider import BaseLLMProvider
from app.llm.deepseek_provider import DeepSeekProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.local_provider import LocalProvider
from app.llm.openai_provider import OpenAIProvider

log = logging.getLogger(__name__)

_KEYWORD_MAP: Dict[str, str] = {
    "gpt": "openai",
    "openai": "openai",
    "gemini": "gemini",
    "google": "gemini",
    "deepseek": "deepseek",
    "local": "local",
    "ollama": "local",
    "mistral": "local",
    "llama": "local",
}


class ProviderRouter:
    """
    Selects the appropriate LLM provider based on:
      1. requested model ID
      2. provider availability (API key configured)
      3. fallback chain: openai → gemini → deepseek → local
    """

    def __init__(self) -> None:
        self._providers: Dict[str, BaseLLMProvider] = {
            "openai": OpenAIProvider(),
            "gemini": GeminiProvider(),
            "deepseek": DeepSeekProvider(),
            "local": LocalProvider(),
        }

    def route(
        self,
        model_id: Optional[str],
        user_api_key: Optional[str] = None,
    ) -> BaseLLMProvider:
        """Return the best available provider for `model_id`."""
        if model_id:
            model_lower = model_id.lower()
            for keyword, provider_name in _KEYWORD_MAP.items():
                if keyword in model_lower:
                    provider = self._providers[provider_name]
                    if provider.is_available() or user_api_key:
                        return provider

        # Fallback: first available provider
        for provider in self._providers.values():
            if provider.is_available():
                log.info("Falling back to provider: %s", provider.provider_name)
                return provider

        raise RuntimeError(
            "No LLM provider is configured. "
            "Please set at least one of OPENAI_API_KEY, GEMINI_API_KEY, "
            "DEEPSEEK_API_KEY, or LOCAL_LLM_URL."
        )

    def available_providers(self) -> List[str]:
        return [name for name, p in self._providers.items() if p.is_available()]
