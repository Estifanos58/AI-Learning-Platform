"""Streaming – publishes RAG response events to configured sinks."""

from __future__ import annotations

import json
import logging
import uuid
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.observability import get_correlation_id
from app.streaming.sinks.base import StreamSink
from app.streaming.sinks.redis_stream_sink import RedisStreamSink

log = logging.getLogger(__name__)
settings = get_settings()


class ResponseStreamer:
    """Publishes streaming response events to configured backends."""

    def __init__(self) -> None:
        self._sinks: List[StreamSink] = self._build_sinks()

    @staticmethod
    def _build_sinks() -> List[StreamSink]:
        backend = (settings.stream_backend or "dual").lower()
        sinks: List[StreamSink] = []

        if backend in {"kafka", "dual"}:
            sinks.append(_KafkaSink())
        if backend in {"redis", "dual"}:
            sinks.append(RedisStreamSink())

        if not sinks:
            sinks.append(_KafkaSink())
        return sinks

    async def _publish(self, event: Dict[str, Any]) -> None:
        corr_id = get_correlation_id()
        if corr_id and "correlation_id" not in event:
            event["correlation_id"] = corr_id
        for sink in self._sinks:
            await sink.publish(event)

    @staticmethod
    def _stream_key(chatroom_id: str, request_id: str) -> str:
        return f"stream:ai:{request_id}"

    async def publish_chunk(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
        sequence: int,
        content_delta: str,
        citations: List[Dict[str, Any]],
        done: bool,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.chunk.v2",
            "timestamp": _now(),
            "request_id": request_id,
            "message_id": message_id,
            "sequence": sequence,
            "stream_key": self._stream_key(chatroom_id, request_id),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
                "sequence": sequence,
                "content_delta": content_delta,
                "citations": citations,
                "done": done,
            },
        }
        await self._publish(event)

    async def publish_completed(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
        final_content: str,
        citations: List[Dict[str, Any]],
        usage: Dict[str, Any],
        model_used: str,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.completed.v2",
            "timestamp": _now(),
            "request_id": request_id,
            "message_id": message_id,
            "sequence": 0,
            "stream_key": self._stream_key(chatroom_id, request_id),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
                "final_content": final_content,
                "citations": citations,
                "usage": usage,
                "model_used": model_used,
            },
        }
        await self._publish(event)

    async def publish_failed(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
        error: str,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.failed.v2",
            "timestamp": _now(),
            "request_id": request_id,
            "message_id": message_id,
            "sequence": 0,
            "stream_key": self._stream_key(chatroom_id, request_id),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
                "error": error,
                "error_message": error,
            },
        }
        await self._publish(event)

    async def publish_cancelled(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.cancelled.v2",
            "timestamp": _now(),
            "request_id": request_id,
            "message_id": message_id,
            "sequence": 0,
            "stream_key": self._stream_key(chatroom_id, request_id),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
            },
        }
        await self._publish(event)


class _KafkaSink(StreamSink):
    def __init__(self) -> None:
        self._producer = get_producer()

    async def publish(self, event: Dict[str, Any]) -> None:
        topic = self._topic_for_event(event.get("event_type"))
        if not topic:
            return
        event_type = event.get("event_type")
        key = str(event.get("request_id", ""))
        if event_type in {
            "ai.message.completed.v2",
            "ai.message.failed.v2",
            "ai.message.cancelled.v2",
        } and hasattr(self._producer, "send_sync"):
            try:
                await asyncio.to_thread(
                    self._producer.send_sync,
                    topic=topic,
                    key=key,
                    value=event,
                    timeout_seconds=5.0,
                )
                return
            except Exception as exc:
                log.warning(
                    "send_sync failed for terminal event %s (request_id=%s): %s; falling back to async send",
                    event_type,
                    key,
                    exc,
                )

        self._producer.send(
            topic=topic,
            key=key,
            value=event,
        )

    @staticmethod
    def _topic_for_event(event_type: str | None) -> str | None:
        if event_type == "ai.message.chunk.v2":
            return settings.topic_ai_message_chunk_v2
        if event_type == "ai.message.completed.v2":
            return settings.topic_ai_message_completed_v2
        if event_type == "ai.message.failed.v2":
            return settings.topic_ai_message_failed_v2
        if event_type == "ai.message.cancelled.v2":
            return settings.topic_ai_message_cancelled_v2
        return None


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()


class KafkaProducer:
    """Wrapper around kafka-python KafkaProducer supporting confirmed synchronous publishing."""

    def __init__(self) -> None:
        self._producer: Optional[Any] = None

    @property
    def is_started(self) -> bool:
        return self._producer is not None

    def start(self) -> None:
        if self._producer is not None:
            return
        from kafka import KafkaProducer as _KP  # type: ignore[import]

        self._producer = _KP(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            key_serializer=lambda k: k.encode("utf-8") if isinstance(k, str) else k,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            acks="all",
            retries=3,
            linger_ms=5,
        )
        log.info("KafkaProducer connected")

    def stop(self) -> None:
        if self._producer:
            try:
                self._producer.flush(timeout=5)
                self._producer.close()
            except Exception:  # noqa: BLE001
                pass
            finally:
                self._producer = None

    def send(
        self,
        topic: str,
        key: str | None,
        value: Any,
        headers: List[Tuple[str, bytes]] | None = None,
    ) -> None:
        if self._producer is None:
            raise RuntimeError(f"KafkaProducer is not started; cannot publish to {topic}")
        self._producer.send(topic, key=key, value=value, headers=headers)

    def send_sync(
        self,
        topic: str,
        key: str | None,
        value: Any,
        headers: List[Tuple[str, bytes]] | None = None,
        timeout_seconds: float = 10.0,
    ) -> Any:
        """Publish to Kafka and block until broker acknowledges delivery."""
        if self._producer is None:
            raise RuntimeError(f"KafkaProducer is not started; cannot publish synchronously to {topic}")
        future = self._producer.send(topic, key=key, value=value, headers=headers)
        return future.get(timeout=timeout_seconds)


@lru_cache
def get_producer() -> KafkaProducer:
    return KafkaProducer()
