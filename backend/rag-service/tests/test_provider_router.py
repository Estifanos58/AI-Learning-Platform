"""Regression tests for ProviderExecutor error classification and streaming error propagation."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from app.llm.base_provider import LLMChunk, LLMMessage
from app.llm.provider_executor import (
    ProviderExecutor,
    ProviderPermanentError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderTransientError,
    ProviderUnauthorizedError,
    is_retryable_exception,
)


class _FakeProvider:
    def __init__(self, behavior):
        self._behavior = behavior

    async def stream(self, _request):
        if isinstance(self._behavior, Exception):
            raise self._behavior
        for item in self._behavior:
            yield item


@pytest.mark.asyncio
async def test_provider_executor_classifies_rate_limit_as_retryable(monkeypatch):
    executor = ProviderExecutor()
    err = RuntimeError("HTTP 429 rate limit exceeded")
    executor._providers["openai"] = _FakeProvider(err)
    executor._pool_manager.mark_throttled = AsyncMock()

    with pytest.raises(ProviderRateLimitError) as exc_info:
        await executor.execute(
            provider_name="openai",
            provider_model_name="gpt-4o-mini",
            api_key="sk-test",
            messages=[LLMMessage(role="user", content="hi")],
            endpoint_id="ep-1",
            account_id="acc-1",
        )
    assert is_retryable_exception(exc_info.value) is True


@pytest.mark.asyncio
async def test_provider_executor_classifies_unauthorized_as_permanent():
    executor = ProviderExecutor()
    err = RuntimeError("HTTP 401 unauthorized invalid api key")
    executor._providers["openai"] = _FakeProvider(err)
    executor._pool_manager.mark_unauthorized = AsyncMock()

    with pytest.raises(ProviderUnauthorizedError) as exc_info:
        await executor.execute(
            provider_name="openai",
            provider_model_name="gpt-4o-mini",
            api_key="bad-key",
            messages=[LLMMessage(role="user", content="hi")],
            endpoint_id="ep-1",
            account_id="acc-1",
        )
    assert is_retryable_exception(exc_info.value) is False


@pytest.mark.asyncio
async def test_provider_executor_classifies_timeout_and_error_chunk_as_retryable():
    executor = ProviderExecutor()
    executor._providers["openai"] = _FakeProvider(asyncio.TimeoutError("timed out"))
    executor._pool_manager.mark_timeout = AsyncMock()

    with pytest.raises(ProviderTimeoutError) as exc_info:
        await executor.execute(
            provider_name="openai",
            provider_model_name="gpt-4o-mini",
            api_key="sk-test",
            messages=[LLMMessage(role="user", content="hi")],
            endpoint_id="ep-1",
            account_id="acc-1",
        )
    assert is_retryable_exception(exc_info.value) is True

    executor._providers["openai"] = _FakeProvider([LLMChunk(delta="", done=True, finish_reason="error")])
    with pytest.raises(ProviderTransientError):
        await executor.execute(
            provider_name="openai",
            provider_model_name="gpt-4o-mini",
            api_key="sk-test",
            messages=[LLMMessage(role="user", content="hi")],
            endpoint_id="ep-1",
            account_id="acc-1",
        )


@pytest.mark.asyncio
async def test_provider_executor_unsupported_provider_is_permanent():
    executor = ProviderExecutor()
    with pytest.raises(ProviderPermanentError):
        await executor.execute(
            provider_name="nonexistent",
            provider_model_name="model",
            api_key="k",
            messages=[LLMMessage(role="user", content="hi")],
            endpoint_id="ep-1",
            account_id="acc-1",
        )
