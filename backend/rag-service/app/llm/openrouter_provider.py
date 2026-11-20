"""LLM – OpenRouter provider (OpenAI-compatible API)."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from app.config import get_settings
from app.llm.base_provider import BaseLLMProvider, LLMChunk, LLMRequest, LLMUsage

log = logging.getLogger(__name__)
settings = get_settings()

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterProvider(BaseLLMProvider):

    def __init__(self) -> None:
        self._usage = LLMUsage()

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def default_model(self) -> str:
        return "openai/gpt-4o-mini"

    def is_available(self) -> bool:
        return bool(settings.openrouter_api_key)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        api_key = request.user_api_key or settings.openrouter_api_key
        model = request.model or self.default_model
        try:
            from openai import AsyncOpenAI  # type: ignore[import]

            client = AsyncOpenAI(api_key=api_key, base_url=_OPENROUTER_BASE_URL)
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=True,
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if hasattr(chunk, "usage") and chunk.usage:
                    self._usage.prompt_tokens = getattr(chunk.usage, "prompt_tokens", 0) or self._usage.prompt_tokens
                    self._usage.completion_tokens = getattr(chunk.usage, "completion_tokens", 0) or self._usage.completion_tokens
                    self._usage.total_tokens = getattr(chunk.usage, "total_tokens", 0) or self._usage.total_tokens

                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta.content or ""
                done = chunk.choices[0].finish_reason is not None
                yield LLMChunk(
                    delta=delta,
                    done=done,
                    finish_reason=chunk.choices[0].finish_reason,
                )
                if done:
                    break
        except Exception as exc:  # noqa: BLE001
            log.error("OpenRouter streaming error: %s", exc)
            raise

    async def get_usage(self) -> LLMUsage:
        return self._usage
