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
        return "gemini-2.0-flash"

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        api_key = request.user_api_key or settings.gemini_api_key
        model = request.model or self.default_model
        if not api_key:
            log.error("Gemini API key is missing")
            yield LLMChunk(delta="", done=True, finish_reason="error")
            return

        try:
            try:
                from google import genai  # type: ignore[import]
                from google.genai import types  # type: ignore[import]

                client = genai.Client(api_key=api_key)

                system_messages = [m.content for m in request.messages if m.role == "system" and m.content]
                user_and_assistant = [m for m in request.messages if m.role != "system" and m.content]

                contents: list[types.Content] = []
                for message in user_and_assistant:
                    # Gemini expects alternating "user" and "model" roles.
                    role = "model" if message.role == "assistant" else "user"
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=message.content)],
                        )
                    )

                config_kwargs: dict[str, object] = {
                    "max_output_tokens": request.max_tokens,
                    "temperature": request.temperature,
                }
                if system_messages:
                    config_kwargs["system_instruction"] = "\n\n".join(system_messages)

                generate_content_config = types.GenerateContentConfig(**config_kwargs)

                response = client.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=generate_content_config,
                )
                for chunk in response:
                    text = chunk.text or ""
                    if text:
                        yield LLMChunk(delta=text, done=False)
                yield LLMChunk(delta="", done=True, finish_reason="stop")
                return
            except ModuleNotFoundError:
                log.error("google-genai is not installed. Install it with: pip install google-genai")
                yield LLMChunk(delta="", done=True, finish_reason="error")
        except Exception as exc:  # noqa: BLE001
            log.error("Gemini streaming error: %s", exc)
            yield LLMChunk(delta="", done=True, finish_reason="error")

    async def get_usage(self) -> LLMUsage:
        return self._usage
