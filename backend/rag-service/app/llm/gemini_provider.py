"""LLM – Google Gemini provider with non-blocking async streaming and token usage tracking."""

from __future__ import annotations

import asyncio
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
        return "gemini-2.5-flash"

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        api_key = request.user_api_key or settings.gemini_api_key
        raw_model = (request.model or self.default_model).strip()
        if raw_model.startswith("models/"):
            raw_model = raw_model[7:]
        # Map deprecated models to active replacements
        if raw_model in ("gemini-2.0-flash", "gemini-2.0-flash-exp"):
            model = "gemini-2.5-flash"
        elif raw_model in ("gemini-2.0-pro", "gemini-2.0-pro-exp"):
            model = "gemini-2.5-pro"
        else:
            model = raw_model

        if not api_key:
            raise ValueError("Gemini API key is missing")

        try:
            try:
                from google import genai  # type: ignore[import]
                from google.genai import types  # type: ignore[import]
            except ModuleNotFoundError as exc:
                raise RuntimeError("google-genai is not installed. Install it with: pip install google-genai") from exc

            client = genai.Client(api_key=api_key)

            system_messages = [m.content for m in request.messages if m.role == "system" and m.content]
            user_and_assistant = [m for m in request.messages if m.role != "system" and m.content]

            contents: list[types.Content] = []
            for message in user_and_assistant:
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

            # Use asynchronous client.aio to avoid blocking the event loop
            if hasattr(client, "aio") and hasattr(client.aio.models, "generate_content_stream"):
                response = await client.aio.models.generate_content_stream(
                    model=model,
                    contents=contents,
                    config=generate_content_config,
                )
                async for chunk in response:
                    text = chunk.text or ""
                    if text:
                        yield LLMChunk(delta=text, done=False)
                    if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                        self._usage.prompt_tokens = getattr(chunk.usage_metadata, "prompt_token_count", 0) or self._usage.prompt_tokens
                        self._usage.completion_tokens = getattr(chunk.usage_metadata, "candidates_token_count", 0) or self._usage.completion_tokens
                        self._usage.total_tokens = getattr(chunk.usage_metadata, "total_token_count", 0) or self._usage.total_tokens
            else:
                # Threaded queue fallback for legacy or sync-only clients to prevent event loop blocking
                loop = asyncio.get_running_loop()
                queue: asyncio.Queue[LLMChunk | Exception | None] = asyncio.Queue()

                def _sync_worker() -> None:
                    try:
                        sync_resp = client.models.generate_content_stream(
                            model=model,
                            contents=contents,
                            config=generate_content_config,
                        )
                        for chunk in sync_resp:
                            text = chunk.text or ""
                            if text:
                                loop.call_soon_threadsafe(queue.put_nowait, LLMChunk(delta=text, done=False))
                            if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                                self._usage.prompt_tokens = getattr(chunk.usage_metadata, "prompt_token_count", 0) or self._usage.prompt_tokens
                                self._usage.completion_tokens = getattr(chunk.usage_metadata, "candidates_token_count", 0) or self._usage.completion_tokens
                                self._usage.total_tokens = getattr(chunk.usage_metadata, "total_token_count", 0) or self._usage.total_tokens
                        loop.call_soon_threadsafe(queue.put_nowait, None)
                    except Exception as err:
                        loop.call_soon_threadsafe(queue.put_nowait, err)

                worker_thread = asyncio.create_task(asyncio.to_thread(_sync_worker))
                try:
                    while True:
                        item = await queue.get()
                        if item is None:
                            break
                        if isinstance(item, Exception):
                            raise item
                        yield item
                finally:
                    await worker_thread

            yield LLMChunk(delta="", done=True, finish_reason="stop")
        except Exception as exc:  # noqa: BLE001
            log.error("Gemini streaming error: %s", exc)
            raise

    async def get_usage(self) -> LLMUsage:
        return self._usage
