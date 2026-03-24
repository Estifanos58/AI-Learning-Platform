"""LLM – Provider router: selects provider from model ID + availability."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from app.llm.base_provider import BaseLLMProvider
from app.llm.deepseek_provider import DeepSeekProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider
from app.llm.local_provider import LocalProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.openrouter_provider import OpenRouterProvider

log = logging.getLogger(__name__)

_KEYWORD_MAP: Dict[str, str] = {
    "gpt": "openai",
    "openai": "openai",
    "gemini": "gemini",
    "google": "gemini",
    "openrouter": "openrouter",
    "open-router": "openrouter",
    "groq": "groq",
    "deepseek": "deepseek",
    "local": "local",
    "ollama": "local",
    "mistral": "local",
    "llama": "local",
}

_PROVIDER_ALIAS_MAP: Dict[str, str] = {
    "openai": "openai",
    "gemini": "gemini",
    "google": "gemini",
    "openrouter": "openrouter",
    "open-router": "openrouter",
    "groq": "groq",
    "deepseek": "deepseek",
    "local": "local",
    "ollama": "local",
}


class ProviderRouter:
    """
    Selects the appropriate LLM provider based on:
      1. requested model ID
      2. provider availability (API key configured)
            3. fallback chain: openai → gemini → openrouter → groq → deepseek → local
    """

    def __init__(self) -> None:
        self._providers: Dict[str, BaseLLMProvider] = {
            "openai": OpenAIProvider(),
            "gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
            "groq": GroqProvider(),
            "deepseek": DeepSeekProvider(),
            "local": LocalProvider(),
        }

    def route(
        self,
        model_id: Optional[str],
        user_api_key: Optional[str] = None,
        preferred_provider: Optional[str] = None,
        allow_fallback: bool = True,
    ) -> BaseLLMProvider:
        """Return the best available provider for `model_id`."""
        requested_provider_name: Optional[str] = None

        if preferred_provider:
            provider_name = _PROVIDER_ALIAS_MAP.get(preferred_provider.lower())
            if provider_name is None:
                raise RuntimeError(
                    f"Requested provider '{preferred_provider}' is not supported."
                )

            requested_provider_name = provider_name
            provider = self._providers.get(provider_name)
            if provider and (provider.is_available() or user_api_key):
                return provider

            raise RuntimeError(
                f"Requested provider '{provider_name}' is not available. "
                "Configure provider credentials/dependencies or provide a user API key."
            )

        if model_id:
            model_lower = model_id.lower()
            for keyword, provider_name in _KEYWORD_MAP.items():
                if keyword in model_lower:
                    requested_provider_name = provider_name
                    provider = self._providers[provider_name]
                    if provider.is_available() or user_api_key:
                        return provider
                    raise RuntimeError(
                        f"Requested model '{model_id}' maps to provider '{provider_name}', "
                        "but it is not available. Configure provider credentials/dependencies "
                        "or provide a user API key."
                    )

            if not allow_fallback:
                raise RuntimeError(
                    f"Unable to map requested model '{model_id}' to a supported provider."
                )

        if requested_provider_name and not allow_fallback:
            raise RuntimeError(
                f"Requested provider '{requested_provider_name}' is not available."
            )

        if not allow_fallback and (model_id or preferred_provider):
            raise RuntimeError(
                "Fallback is disabled for explicit model/provider requests."
            )

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
