"""LLM – OpenAI provider (GPT-4o, GPT-4o-mini, …)."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from app.config import get_settings
from app.llm.base_provider import BaseLLMProvider, LLMChunk, LLMRequest, LLMUsage

log = logging.getLogger(__name__)
settings = get_settings()


class OpenAIProvider(BaseLLMProvider):

    def __init__(self) -> None:
        self._usage = LLMUsage()

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return settings.openai_model

    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        api_key = request.user_api_key or settings.openai_api_key
        model = request.model or self.default_model
        try:
            from openai import AsyncOpenAI  # type: ignore[import]

            client = AsyncOpenAI(api_key=api_key)
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                done = chunk.choices[0].finish_reason is not None
                yield LLMChunk(delta=delta, done=done, finish_reason=chunk.choices[0].finish_reason)
                if done:
                    break
        except Exception as exc:  # noqa: BLE001
            log.error("OpenAI streaming error: %s", exc)
            yield LLMChunk(delta="", done=True, finish_reason="error")

    async def get_usage(self) -> LLMUsage:
        return self._usage
