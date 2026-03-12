"""LLM – Local provider (Ollama / llama.cpp / vLLM OpenAI-compatible)."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from app.config import get_settings
from app.llm.base_provider import BaseLLMProvider, LLMChunk, LLMRequest, LLMUsage

log = logging.getLogger(__name__)
settings = get_settings()


class LocalProvider(BaseLLMProvider):

    def __init__(self) -> None:
        self._usage = LLMUsage()

    @property
    def provider_name(self) -> str:
        return "local"

    @property
    def default_model(self) -> str:
        return settings.local_llm_model

    def is_available(self) -> bool:
        return bool(settings.local_llm_url)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        base_url = settings.local_llm_url
        model = request.model or self.default_model
        try:
            from openai import AsyncOpenAI  # type: ignore[import]

            client = AsyncOpenAI(api_key="local", base_url=f"{base_url}/v1")
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
            log.error("Local LLM streaming error: %s", exc)
            yield LLMChunk(delta="", done=True, finish_reason="error")

    async def get_usage(self) -> LLMUsage:
        return self._usage
