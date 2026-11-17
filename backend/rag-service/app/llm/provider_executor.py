from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Dict, List

import httpx

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.llm.account_pool_manager import AccountPoolManager
from app.llm.base_provider import LLMMessage, LLMRequest
from app.llm.deepseek_provider import DeepSeekProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider
from app.llm.local_provider import LocalProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.openrouter_provider import OpenRouterProvider

log = logging.getLogger(__name__)
settings = get_settings()


class ProviderRateLimitError(RuntimeError):
    pass


class ProviderUnauthorizedError(RuntimeError):
    pass


class ProviderTimeoutError(RuntimeError):
    pass


@dataclass
class ProviderExecutionResult:
    content: str
    tokens_used: int


class ProviderExecutor:
    def __init__(self) -> None:
        self._pool_manager = AccountPoolManager()
        self._providers: Dict[str, object] = {
            "openai": OpenAIProvider(),
            "gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
            "groq": GroqProvider(),
            "deepseek": DeepSeekProvider(),
            "local": LocalProvider(),
        }

    def supported_providers(self) -> List[str]:
        return sorted(self._providers.keys())

    async def execute(
        self,
        provider_name: str,
        provider_model_name: str,
        api_key: str,
        messages: list[LLMMessage],
        endpoint_id: str,
        account_id: str,
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> ProviderExecutionResult:
        provider_key = (provider_name or "").lower()
        provider = self._providers.get(provider_key)
        if provider is None:
            raise RuntimeError(f"Unsupported provider '{provider_name}'")

        request = LLMRequest(
            messages=messages,
            model=provider_model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=False,
            user_api_key=api_key,
        )

        try:
            parts: list[str] = []
            async for chunk in provider.stream(request):
                parts.append(chunk.delta)

            content = "".join(parts)
            tokens_used = self._estimate_tokens(messages, content)

            async with AsyncSessionLocal() as session:
                await self._pool_manager.mark_success(
                    session=session,
                    endpoint_id=endpoint_id,
                    account_id=account_id,
                    tokens_used=tokens_used,
                )

            return ProviderExecutionResult(content=content, tokens_used=tokens_used)
        except Exception as exc:  # noqa: BLE001
            await self._handle_error(exc, endpoint_id, account_id)
            raise

    async def _handle_error(self, exc: Exception, endpoint_id: str, account_id: str) -> None:
        status_code = self._status_code_from_error(exc)

        async with AsyncSessionLocal() as session:
            if status_code == 429:
                await self._pool_manager.mark_throttled(session, endpoint_id, account_id)
                raise ProviderRateLimitError("Provider account rate-limited") from exc
            if status_code == 401:
                await self._pool_manager.mark_unauthorized(session, endpoint_id, account_id)
                raise ProviderUnauthorizedError("Provider account unauthorized") from exc

            if isinstance(exc, (TimeoutError, asyncio.TimeoutError, httpx.TimeoutException)):
                await self._pool_manager.mark_timeout(session, endpoint_id, account_id)
                raise ProviderTimeoutError("Provider request timed out") from exc

        log.error("Provider execution failed: %s", exc)

    def _status_code_from_error(self, exc: Exception) -> int | None:
        status_code = getattr(exc, "status_code", None)
        if isinstance(status_code, int):
            return status_code

        response = getattr(exc, "response", None)
        if response is not None:
            code = getattr(response, "status_code", None)
            if isinstance(code, int):
                return code

        body = str(exc)
        if " 429" in body or "rate limit" in body.lower():
            return 429
        if " 401" in body or "unauthorized" in body.lower() or "invalid api key" in body.lower():
            return 401
        return None

    def _estimate_tokens(self, messages: list[LLMMessage], content: str) -> int:
        prompt_chars = sum(len(item.content) for item in messages)
        completion_chars = len(content)
        # Lightweight estimate: ~4 chars per token.
        return max(1, (prompt_chars + completion_chars) // 4)
