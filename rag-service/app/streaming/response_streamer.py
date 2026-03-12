"""Streaming – Kafka producer for RAG response events."""

from __future__ import annotations

import json
import logging
import time
import uuid
from functools import lru_cache
from typing import Any, Dict, List, Optional

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class ResponseStreamer:
    """Publishes streaming response events to Kafka."""

    def __init__(self) -> None:
        self._producer = get_producer()

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
            "event_type": "ai.message.chunk.v1",
            "timestamp": _now(),
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
        self._producer.send(
            topic=settings.topic_ai_message_chunk_v1,
            key=request_id,
            value=event,
        )

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
            "event_type": "ai.message.completed.v1",
            "timestamp": _now(),
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
        self._producer.send(
            topic=settings.topic_ai_message_completed_v1,
            key=request_id,
            value=event,
        )

    async def publish_failed(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
        error: str,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.failed.v1",
            "timestamp": _now(),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
                "error": error,
            },
        }
        self._producer.send(
            topic=settings.topic_ai_message_failed_v1,
            key=request_id,
            value=event,
        )

    async def publish_cancelled(
        self,
        chatroom_id: str,
        message_id: str,
        request_id: str,
    ) -> None:
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": "ai.message.cancelled.v1",
            "timestamp": _now(),
            "payload": {
                "chatroom_id": chatroom_id,
                "message_id": message_id,
                "request_id": request_id,
            },
        }
        self._producer.send(
            topic=settings.topic_ai_message_cancelled_v1,
            key=request_id,
            value=event,
        )


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


class KafkaProducer:
    """Thin wrapper around kafka-python KafkaProducer."""

    def __init__(self) -> None:
        self._producer: Optional[Any] = None

    def start(self) -> None:
        try:
            from kafka import KafkaProducer as _KP  # type: ignore[import]

            self._producer = _KP(
                bootstrap_servers=settings.kafka_bootstrap_servers,
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                acks="all",
                retries=3,
                linger_ms=5,
            )
            log.info("KafkaProducer connected")
        except Exception as exc:  # noqa: BLE001
            log.warning("KafkaProducer failed to connect: %s", exc)

    def stop(self) -> None:
        if self._producer:
            try:
                self._producer.flush(timeout=5)
                self._producer.close()
            except Exception:  # noqa: BLE001
                pass

    def send(self, topic: str, key: str, value: Any) -> None:
        if self._producer is None:
            log.debug("Producer not available; skipping send to %s", topic)
            return
        try:
            self._producer.send(topic, key=key, value=value)
        except Exception as exc:  # noqa: BLE001
            log.error("Kafka send failed (topic=%s): %s", topic, exc)


@lru_cache
def get_producer() -> KafkaProducer:
    return KafkaProducer()
