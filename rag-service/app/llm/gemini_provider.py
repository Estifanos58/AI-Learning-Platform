"""LLM – Google Gemini provider."""

from __future__ import annotations

import logging
from typing import AsyncIterator

import httpx

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
                return
            except ModuleNotFoundError:
                prompt = "\n".join(
                    f"{m.role.upper()}: {m.content}" for m in request.messages
                )
                endpoint_model = (
                    model
                    if model.startswith("models/")
                    else f"models/{model}"
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/{endpoint_model}:generateContent"
                params = {"key": api_key}
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": prompt}],
                        }
                    ],
                    "generationConfig": {
                        "maxOutputTokens": request.max_tokens,
                        "temperature": request.temperature,
                    },
                }
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    response.raise_for_status()

                data = response.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    yield LLMChunk(delta="", done=True, finish_reason="error")
                    return

                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))

                yield LLMChunk(delta=text, done=False)
                yield LLMChunk(delta="", done=True, finish_reason="stop")
        except Exception as exc:  # noqa: BLE001
            log.error("Gemini streaming error: %s", exc)
            yield LLMChunk(delta="", done=True, finish_reason="error")

    async def get_usage(self) -> LLMUsage:
        return self._usage
