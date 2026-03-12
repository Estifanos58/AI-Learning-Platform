"""Ingestion – Kafka consumer for file upload and AI request events."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Dict

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class IngestionConsumer:
    """
    Multi-topic Kafka consumer (runs in a background daemon thread).

    Handles:
      • file.uploaded.v2   → ingest file into Qdrant
      • file.deleted.v1    → remove vectors from Qdrant
      • ai.message.requested.v2 → orchestrate RAG and stream response
      • ai.message.cancelled.v1 → cancel active generation
    """

    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="ingestion-consumer"
        )

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

    def _run(self) -> None:
        topics = [
            settings.topic_file_uploaded_v2,
            settings.topic_file_deleted_v1,
            settings.topic_ai_message_requested_v2,
            settings.topic_ai_message_cancelled_v1,
        ]
        try:
            from kafka import KafkaConsumer  # type: ignore[import]
            from kafka.errors import NoBrokersAvailable  # type: ignore[import]
        except ImportError:
            log.warning("kafka-python not installed; consumer disabled")
            return

        consumer = None
        retry_delay = 5
        while not self._stop_event.is_set():
            try:
                consumer = KafkaConsumer(
                    *topics,
                    bootstrap_servers=settings.kafka_bootstrap_servers,
                    group_id=settings.kafka_group_id,
                    auto_offset_reset=settings.kafka_auto_offset_reset,
                    enable_auto_commit=False,
                    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                    key_deserializer=lambda k: k.decode("utf-8") if k else None,
                    session_timeout_ms=30000,
                    heartbeat_interval_ms=10000,
                    max_poll_interval_ms=300000,
                )
                log.info("Kafka consumer connected, topics=%s", topics)
                retry_delay = 5  # reset on success
                self._consume_loop(consumer)
            except Exception as exc:  # noqa: BLE001
                log.error(
                    "Kafka consumer error (retrying in %ds): %s", retry_delay, exc
                )
                if consumer:
                    try:
                        consumer.close()
                    except Exception:  # noqa: BLE001
                        pass
                    consumer = None
                self._stop_event.wait(retry_delay)
                retry_delay = min(retry_delay * 2, 60)

    def _consume_loop(self, consumer: Any) -> None:
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            while not self._stop_event.is_set():
                batch = consumer.poll(timeout_ms=1000, max_records=10)
                if not batch:
                    continue
                for tp, records in batch.items():
                    for record in records:
                        try:
                            loop.run_until_complete(
                                self._dispatch(record.topic, record.value)
                            )
                            consumer.commit()
                        except Exception as exc:  # noqa: BLE001
                            log.error(
                                "Failed to process record from %s: %s",
                                record.topic,
                                exc,
                            )
                            self._send_to_dlt(record)
        finally:
            loop.close()
            consumer.close()

    async def _dispatch(self, topic: str, payload: Dict[str, Any]) -> None:
        if topic == settings.topic_file_uploaded_v2:
            await self._handle_file_uploaded(payload)
        elif topic == settings.topic_file_deleted_v1:
            await self._handle_file_deleted(payload)
        elif topic == settings.topic_ai_message_requested_v2:
            await self._handle_ai_message_requested(payload)
        elif topic == settings.topic_ai_message_cancelled_v1:
            await self._handle_ai_message_cancelled(payload)

    # ── Handlers ─────────────────────────────────────────────────────────────

    async def _handle_file_uploaded(self, event: Dict[str, Any]) -> None:
        from app.ingestion.embedding_pipeline import EmbeddingPipeline
        from app.ingestion.extractor import TextExtractor
        from app.ingestion.file_loader import FileLoader
        from app.ingestion.chunker import RecursiveCharacterTextSplitter

        p = event.get("payload", event)
        file_id = p.get("file_id") or p.get("fileId", "")
        owner_id = p.get("owner_id") or p.get("ownerId", "")
        folder_id = p.get("folder_id") or p.get("folderId")
        storage_path = p.get("storage_path") or p.get("path", "")
        content_type = p.get("content_type") or p.get("contentType", "application/octet-stream")
        file_name = p.get("file_name") or p.get("fileName", "")

        log.info("Ingesting file_id=%s owner=%s", file_id, owner_id)

        loader = FileLoader()
        extractor = TextExtractor()
        splitter = RecursiveCharacterTextSplitter()
        pipeline = EmbeddingPipeline()

        content = loader.load(storage_path)
        result = extractor.extract(content, content_type, file_name)
        chunks = splitter.split(result.text)
        count = await pipeline.embed_and_store(
            chunks=chunks,
            file_id=file_id,
            owner_id=owner_id,
            user_id=owner_id,
            folder_id=folder_id,
            extraction_version=result.extraction_version,
        )
        log.info(
            "Ingestion complete: file_id=%s chunks=%d", file_id, count
        )

    async def _handle_file_deleted(self, event: Dict[str, Any]) -> None:
        from app.storage.qdrant_client import get_qdrant_client

        p = event.get("payload", event)
        file_id = p.get("file_id") or p.get("fileId", "")
        log.info("Deleting vectors for file_id=%s", file_id)
        await get_qdrant_client().delete_by_file_id(file_id)

    async def _handle_ai_message_requested(self, event: Dict[str, Any]) -> None:
        from app.orchestration.pipeline_executor import PipelineExecutor

        p = event.get("payload", event)
        executor = PipelineExecutor()
        await executor.execute(p)

    async def _handle_ai_message_cancelled(self, event: Dict[str, Any]) -> None:
        from app.orchestration.pipeline_executor import PipelineExecutor

        p = event.get("payload", event)
        request_id = p.get("request_id") or p.get("messageId", "")
        PipelineExecutor.cancel(request_id)
        log.info("Cancellation requested for request_id=%s", request_id)

    def _send_to_dlt(self, record: Any) -> None:
        """Send failed record to dead-letter topic."""
        try:
            from app.streaming.response_streamer import get_producer

            dlt_topic = (
                settings.topic_file_uploaded_dlt
                if settings.topic_file_uploaded_v2 in record.topic
                else settings.topic_ai_message_requested_dlt
            )
            producer = get_producer()
            producer.send(dlt_topic, key=record.key, value=record.value)
        except Exception as exc:  # noqa: BLE001
            log.error("Failed to send to DLT: %s", exc)
