from __future__ import annotations

import logging
from typing import Any, Dict

from app.config import get_settings
from app.streaming.sinks.base import StreamSink

log = logging.getLogger(__name__)
settings = get_settings()


class KafkaSink(StreamSink):
    def __init__(self) -> None:
        from app.streaming.response_streamer import get_producer

        self._producer = get_producer()

    async def publish(self, event: Dict[str, Any]) -> None:
        event_type = event.get("event_type")
        topic = self._topic_for_event(event_type)
        if not topic:
            return
        try:
            self._producer.send(
                topic=topic,
                key=str(event.get("request_id", "")),
                value=event,
            )
        except Exception as exc:  # noqa: BLE001
            log.error("Kafka sink publish failed type=%s: %s", event_type, exc)

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
