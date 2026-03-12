"""LLM – Google Gemini provider."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from app.config import get_settings
from app.llm.base_provider import BaseLLMProvider, LLMChunk, LLMRequest, LLMUsage

log = logging.getLogger(__name__)
settings = get_settings()


class GeminiProvider(BaseLLMProvider):

    def __init__(self) -> None:
        self._usage = LLMUsage()

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def default_model(self) -> str:
        return settings.gemini_model

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        api_key = request.user_api_key or settings.gemini_api_key
        model = request.model or self.default_model
        try:
            import google.generativeai as genai  # type: ignore[import]

            genai.configure(api_key=api_key)
            gmodel = genai.GenerativeModel(model)
            prompt = "\n".join(
                f"{m.role.upper()}: {m.content}" for m in request.messages
            )
            response = gmodel.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=request.max_tokens,
                    temperature=request.temperature,
                ),
                stream=True,
            )
            for chunk in response:
                text = chunk.text or ""
                yield LLMChunk(delta=text, done=False)
            yield LLMChunk(delta="", done=True, finish_reason="stop")
        except Exception as exc:  # noqa: BLE001
            log.error("Gemini streaming error: %s", exc)
            yield LLMChunk(delta="", done=True, finish_reason="error")

    async def get_usage(self) -> LLMUsage:
        return self._usage
