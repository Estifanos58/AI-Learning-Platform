from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Awaitable, Callable, Dict, List, Optional

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


class ProviderError(RuntimeError):
    """Base error for LLM provider execution."""

    def __init__(self, message: str, *, retryable: bool = False, error_code: str = "PROVIDER_ERROR") -> None:
        super().__init__(message)
        self.retryable = retryable
        self.error_code = error_code


class ProviderTransientError(ProviderError):
    """Retryable transient AI provider error (429, 5xx, timeout, network)."""

    def __init__(self, message: str, *, error_code: str = "PROVIDER_TRANSIENT") -> None:
        super().__init__(message, retryable=True, error_code=error_code)


class ProviderPermanentError(ProviderError):
    """Non-retryable AI provider error (400, 401, 403, 404, invalid config)."""

    def __init__(self, message: str, *, error_code: str = "PROVIDER_PERMANENT") -> None:
        super().__init__(message, retryable=False, error_code=error_code)


class ProviderRateLimitError(ProviderTransientError):
    def __init__(self, message: str = "Provider account rate-limited") -> None:
        super().__init__(message, error_code="PROVIDER_RATE_LIMIT")


class ProviderUnauthorizedError(ProviderPermanentError):
    def __init__(self, message: str = "Provider account unauthorized") -> None:
        super().__init__(message, error_code="PROVIDER_UNAUTHORIZED")


class ProviderTimeoutError(ProviderTransientError):
    def __init__(self, message: str = "Provider request timed out") -> None:
        super().__init__(message, error_code="PROVIDER_TIMEOUT")


def is_retryable_exception(exc: BaseException) -> bool:
    if isinstance(exc, ProviderError):
        return exc.retryable
    if getattr(exc, "retryable", None) is True:
        return True
    if getattr(exc, "retryable", None) is False:
        return False
    if isinstance(exc, (TimeoutError, asyncio.TimeoutError, httpx.TimeoutException, httpx.NetworkError, ConnectionError)):
        return True
    status_code = _extract_status_code(exc)
    if status_code is not None:
        return status_code in (408, 429) or status_code >= 500
    return False


def _extract_status_code(exc: BaseException) -> int | None:
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    response = getattr(exc, "response", None)
    if response is not None:
        code = getattr(response, "status_code", None)
        if isinstance(code, int):
            return code

    body = str(exc).lower()
    if "429" in body or "rate limit" in body or "too many requests" in body:
        return 429
    if "401" in body or "unauthorized" in body or "invalid api key" in body:
        return 401
    if "503" in body or "502" in body or "504" in body or "500" in body or "service unavailable" in body:
        return 503
    return None


@dataclass
class ProviderExecutionResult:
    content: str
    tokens_used: int
    provider_name: str = ""
    provider_model_name: str = ""
    endpoint_id: str = ""
    account_id: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


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
        on_chunk: Callable[[str], Awaitable[None]] | None = None,
    ) -> ProviderExecutionResult:
        provider_key = (provider_name or "").lower()
        provider = self._providers.get(provider_key)
        if provider is None:
            raise ProviderPermanentError(
                f"Unsupported provider '{provider_name}'",
                error_code="UNSUPPORTED_PROVIDER",
            )

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
                if getattr(chunk, "finish_reason", None) == "error":
                    raise ProviderTransientError(
                        f"Provider '{provider_name}' reported an error during streaming"
                    )
                if chunk.delta:
                    parts.append(chunk.delta)
                    if on_chunk is not None:
                        await on_chunk(chunk.delta)

            content = "".join(parts)
            prompt_tokens = 0
            completion_tokens = 0
            if hasattr(provider, "get_usage"):
                usage = await provider.get_usage()
                prompt_tokens = getattr(usage, "prompt_tokens", 0)
                completion_tokens = getattr(usage, "completion_tokens", 0)

            est_tokens = self._estimate_tokens(messages, content)
            tokens_used = (prompt_tokens + completion_tokens) if (prompt_tokens + completion_tokens) > 0 else est_tokens

            async with AsyncSessionLocal() as session:
                await self._pool_manager.mark_success(
                    session=session,
                    endpoint_id=endpoint_id,
                    account_id=account_id,
                    tokens_used=tokens_used,
                )

            return ProviderExecutionResult(
                content=content,
                tokens_used=tokens_used,
                provider_name=provider_name,
                provider_model_name=provider_model_name,
                endpoint_id=endpoint_id,
                account_id=account_id,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=tokens_used,
            )
        except Exception as exc:  # noqa: BLE001
            await self._handle_error(exc, endpoint_id, account_id)
            raise

    async def _handle_error(self, exc: Exception, endpoint_id: str, account_id: str) -> None:
        if isinstance(exc, ProviderError):
            if isinstance(exc, ProviderRateLimitError):
                async with AsyncSessionLocal() as session:
                    await self._pool_manager.mark_throttled(session, endpoint_id, account_id)
            elif isinstance(exc, ProviderUnauthorizedError):
                async with AsyncSessionLocal() as session:
                    await self._pool_manager.mark_unauthorized(session, endpoint_id, account_id)
            elif isinstance(exc, ProviderTimeoutError):
                async with AsyncSessionLocal() as session:
                    await self._pool_manager.mark_timeout(session, endpoint_id, account_id)
            return

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
            if isinstance(exc, (httpx.NetworkError, ConnectionError)) or (status_code is not None and (status_code == 408 or status_code >= 500)):
                await self._pool_manager.mark_timeout(session, endpoint_id, account_id)
                raise ProviderTransientError(f"Transient provider failure (status={status_code}): {exc}") from exc

        log.error("Provider execution failed permanently: %s", exc)
        if status_code is not None and 400 <= status_code < 500:
            raise ProviderPermanentError(f"Provider rejected request (HTTP {status_code}): {exc}") from exc

    def _status_code_from_error(self, exc: Exception) -> int | None:
        return _extract_status_code(exc)

    def _estimate_tokens(self, messages: list[LLMMessage], content: str) -> int:
        prompt_chars = sum(len(item.content) for item in messages)
        completion_chars = len(content)
        return max(1, (prompt_chars + completion_chars) // 4)
