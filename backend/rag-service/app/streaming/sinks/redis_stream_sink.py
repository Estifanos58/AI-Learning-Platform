from __future__ import annotations

import json
import logging
from typing import Any, Dict

from redis.asyncio import Redis

from app.config import get_settings
from app.streaming.sinks.base import StreamSink

log = logging.getLogger(__name__)
settings = get_settings()


class RedisStreamSink(StreamSink):
    def __init__(self) -> None:
        self._redis: Redis | None = None

    async def _client(self) -> Redis:
        if self._redis is None:
            self._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event: Dict[str, Any]) -> None:
        stream_key = event.get("stream_key")
        if not stream_key:
            return
        fields = {
            "event_type": str(event.get("event_type", "")),
            "request_id": str(event.get("request_id", "")),
            "message_id": str(event.get("message_id", "")),
            "sequence": str(event.get("sequence", 0)),
            "ts": str(event.get("timestamp", "")),
            "payload": json.dumps(event.get("payload", {}), ensure_ascii=False),
        }
        try:
            client = await self._client()
            log.info("Publishing AI event to Redis stream_key=%s event_type=%s payload=%s", stream_key, fields.get("event_type"), fields.get("payload"))
            await client.xadd(
                stream_key,
                fields=fields,
                maxlen=settings.redis_stream_maxlen,
                approximate=True,
            )
        except Exception as exc:  # noqa: BLE001
            log.error("Redis stream publish failed stream_key=%s: %s", stream_key, exc)
