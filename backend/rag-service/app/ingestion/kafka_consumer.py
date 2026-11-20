"""Ingestion – Kafka consumer for file upload, deletion, and AI execution events."""

from __future__ import annotations

import asyncio
import base64
import concurrent.futures
import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Callable, Dict

from app.config import get_settings
from app.observability import (
    INGESTION_TOTAL,
    KAFKA_CONSUME_TOTAL,
    KAFKA_DLT_TOTAL,
    reset_correlation_id,
    set_correlation_id,
)

log = logging.getLogger(__name__)
settings = get_settings()


class IngestionConsumer:
    """
    Multi-topic Kafka consumer (runs in a background daemon thread).

    Commit semantics:
      - enable_auto_commit=False
      - Records are deserialized safely per record (malformed payloads never crash poll()).
      - Exact per-partition offset (record.offset + 1) is committed ONLY AFTER:
          1. Successful processing of that record, OR
          2. Confirmed broker-acknowledged publication to the corresponding Dead-Letter Topic.
      - If DLT publication fails, the offset is NOT committed and consumption pauses/aborts
        so the broker redelivers the record without data loss.
    """

    def __init__(
        self,
        event_loop: asyncio.AbstractEventLoop,
        *,
        producer_factory: Callable[[], Any] | None = None,
        record_timeout_seconds: float = 240.0,
    ) -> None:
        self._event_loop = event_loop
        self._producer_factory = producer_factory
        self._record_timeout_seconds = record_timeout_seconds
        self._stop_event = threading.Event()
        self._connected = False
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="ingestion-consumer"
        )

    @property
    def is_alive(self) -> bool:
        return self._thread.is_alive()

    @property
    def is_connected(self) -> bool:
        return self._connected and self._thread.is_alive()

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._connected = False
        if self._thread.is_alive():
            self._thread.join(timeout=5)

    def _run(self) -> None:
        topics = [
            settings.topic_file_uploaded_v2,
            settings.topic_file_deleted_v1,
            settings.topic_ai_message_requested_v2,
            settings.topic_ai_message_cancelled_v2,
        ]
        try:
            from kafka import KafkaConsumer  # type: ignore[import]
        except ImportError:
            log.error("kafka-python is not installed; consumer cannot start")
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
                    key_deserializer=lambda k: k.decode("utf-8", errors="replace") if k else None,
                    session_timeout_ms=30000,
                    heartbeat_interval_ms=10000,
                    max_poll_interval_ms=300000,
                )
                self._connected = True
                log.info("Kafka consumer connected, topics=%s", topics)
                retry_delay = 5
                self._consume_loop(consumer)
            except Exception as exc:  # noqa: BLE001
                self._connected = False
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
        try:
            while not self._stop_event.is_set():
                batch = consumer.poll(timeout_ms=1000, max_records=10)
                if not batch:
                    continue
                for tp, records in batch.items():
                    abort_partition = False
                    for record in records:
                        if self._stop_event.is_set():
                            break
                        committed = self._process_single_record(consumer, tp, record)
                        if not committed:
                            # Do not advance past an uncommitted record in this partition
                            abort_partition = True
                            break
                    if abort_partition:
                        break
        finally:
            self._connected = False
            try:
                consumer.close()
            except Exception:  # noqa: BLE001
                pass

    def _process_single_record(self, consumer: Any, tp: Any, record: Any) -> bool:
        """
        Process one record and commit ONLY its exact offset (record.offset + 1).
        Returns True if the offset was safely committed (either after success or confirmed DLT).
        Returns False if DLT delivery failed and offset must NOT be committed.
        """
        correlation_id = self._extract_correlation_id(record)
        token = set_correlation_id(correlation_id)
        task_ref: list[asyncio.Task[None]] = []

        async def _run_tracked() -> None:
            current = asyncio.current_task()
            if current is not None:
                task_ref.append(current)
            await self._dispatch_with_correlation(record.topic, payload, correlation_id)

        future = None
        try:
            payload = self._decode_payload(record.value)
            future = asyncio.run_coroutine_threadsafe(
                _run_tracked(),
                self._event_loop,
            )
            future.result(timeout=self._record_timeout_seconds)
            self._commit_record_offset(consumer, tp, record)
            KAFKA_CONSUME_TOTAL.labels(topic=record.topic, status="success").inc()
            return True
        except (concurrent.futures.TimeoutError, TimeoutError) as exc:
            if future is not None:
                future.cancel()
            if task_ref and not task_ref[0].done():
                self._event_loop.call_soon_threadsafe(task_ref[0].cancel)
            KAFKA_CONSUME_TOTAL.labels(topic=record.topic, status="timeout").inc()
            log.error(
                "Kafka record execution timed out after %ss topic=%s partition=%s offset=%s",
                self._record_timeout_seconds,
                record.topic,
                getattr(record, "partition", "?"),
                getattr(record, "offset", "?"),
            )
            dlt_sent = self._send_to_dlt(record, exc, correlation_id)
            if dlt_sent:
                self._commit_record_offset(consumer, tp, record)
                return True
            return False
        except Exception as exc:  # noqa: BLE001
            KAFKA_CONSUME_TOTAL.labels(topic=record.topic, status="error").inc()
            log.error(
                "Failed to process Kafka record topic=%s partition=%s offset=%s: %s",
                record.topic,
                getattr(record, "partition", "?"),
                getattr(record, "offset", "?"),
                exc,
            )
            dlt_sent = self._send_to_dlt(record, exc, correlation_id)
            if dlt_sent:
                self._commit_record_offset(consumer, tp, record)
                return True

            log.error(
                "DLT publish failed; leaving offset uncommitted for redelivery topic=%s partition=%s offset=%s",
                record.topic,
                getattr(record, "partition", "?"),
                getattr(record, "offset", "?"),
            )
            return False
        finally:
            reset_correlation_id(token)

    def _commit_record_offset(self, consumer: Any, tp: Any, record: Any) -> None:
        from kafka.structs import OffsetAndMetadata  # type: ignore[import]

        try:
            offset_meta = OffsetAndMetadata(record.offset + 1, "")
        except TypeError:
            offset_meta = OffsetAndMetadata(record.offset + 1, "", -1)
        consumer.commit({tp: offset_meta})

    def _decode_payload(self, raw_value: Any) -> Dict[str, Any]:
        if isinstance(raw_value, dict):
            return raw_value
        if isinstance(raw_value, (bytes, bytearray)):
            decoded = json.loads(raw_value.decode("utf-8"))
        elif isinstance(raw_value, str):
            decoded = json.loads(raw_value)
        else:
            raise ValueError(f"Unsupported Kafka message value type: {type(raw_value).__name__}")
        if not isinstance(decoded, dict):
            raise ValueError("Kafka JSON payload must be an object")
        return decoded

    def _extract_correlation_id(self, record: Any) -> str:
        headers = getattr(record, "headers", None) or []
        for key, value in headers:
            if key and key.lower() in {"correlationid", "correlation_id", "x-correlation-id"} and value:
                return value.decode("utf-8", errors="replace") if isinstance(value, (bytes, bytearray)) else str(value)
        return ""

    async def _dispatch_with_correlation(
        self, topic: str, payload: Dict[str, Any], correlation_id: str
    ) -> None:
        corr = correlation_id or str(payload.get("correlationId") or payload.get("correlation_id") or "")
        token = set_correlation_id(corr)
        try:
            await self._dispatch(topic, payload)
        finally:
            reset_correlation_id(token)

    async def _dispatch(self, topic: str, payload: Dict[str, Any]) -> None:
        if topic == settings.topic_file_uploaded_v2:
            await self._handle_file_uploaded(payload)
        elif topic == settings.topic_file_deleted_v1:
            await self._handle_file_deleted(payload)
        elif topic == settings.topic_ai_message_requested_v2:
            await self._handle_ai_message_requested(payload)
        elif topic == settings.topic_ai_message_cancelled_v2:
            await self._handle_ai_message_cancelled(payload)

    # ── Handlers ─────────────────────────────────────────────────────────────

    async def _handle_file_uploaded(self, event: Dict[str, Any]) -> None:
        from app.ingestion.chunker import RecursiveCharacterTextSplitter
        from app.ingestion.embedding_pipeline import EmbeddingPipeline
        from app.ingestion.extractor import TextExtractor
        from app.ingestion.file_loader import FileLoader
        from app.security.file_validator import FileValidator

        p = event.get("payload", event)
        file_id = p.get("file_id") or p.get("fileId", "")
        owner_id = p.get("owner_id") or p.get("ownerId", "")
        folder_id = p.get("folder_id") or p.get("folderId")
        storage_path = p.get("storage_path") or p.get("path", "")
        content_type = p.get("content_type") or p.get("contentType", "application/octet-stream")
        file_name = p.get("file_name") or p.get("fileName", "")

        if not file_id or not storage_path:
            raise ValueError("file.uploaded event missing required file_id or storage_path")

        log.info("Ingesting file_id=%s owner=%s content_type=%s", file_id, owner_id, content_type)

        max_retries = 3
        backoff_delay = 1.0

        for attempt in range(1, max_retries + 1):
            try:
                loader = FileLoader()
                validator = FileValidator()
                extractor = TextExtractor()
                splitter = RecursiveCharacterTextSplitter()
                pipeline = EmbeddingPipeline()

                validator.validate(
                    content_type=content_type,
                    file_size_bytes=1,
                    file_name=file_name,
                    storage_path=storage_path,
                )
                content = loader.load(storage_path)
                validator.validate(
                    content_type=content_type,
                    file_size_bytes=len(content),
                    file_name=file_name,
                    storage_path=storage_path,
                )
                result = extractor.extract(content, content_type, file_name)
                chunks = splitter.split(result.text, elements=result.elements)
                if not chunks:
                    raise ValueError(f"Chunker produced zero chunks for file_id={file_id}")

                count = await pipeline.embed_and_store(
                    chunks=chunks,
                    file_id=file_id,
                    owner_id=owner_id,
                    user_id=owner_id,
                    folder_id=folder_id,
                    extraction_version=result.extraction_version,
                    document_name=file_name,
                )
                INGESTION_TOTAL.labels(status="success", content_type=content_type).inc()
                log.info("Ingestion complete: file_id=%s chunks=%d", file_id, count)
                break
            except Exception as exc:
                from app.llm.provider_executor import is_retryable_exception

                if attempt < max_retries and is_retryable_exception(exc):
                    log.warning(
                        "Transient ingestion error for file_id=%s (attempt %d/%d): %s. Backing off %.1fs",
                        file_id,
                        attempt,
                        max_retries,
                        exc,
                        backoff_delay,
                    )
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                else:
                    INGESTION_TOTAL.labels(status="error", content_type=content_type).inc()
                    raise

    async def _handle_file_deleted(self, event: Dict[str, Any]) -> None:
        from app.storage.qdrant_client import get_qdrant_client

        p = event.get("payload", event)
        file_id = p.get("file_id") or p.get("fileId", "")
        if not file_id:
            raise ValueError("file.deleted event missing file_id")
        log.info("Deleting vectors for file_id=%s", file_id)
        await get_qdrant_client().delete_by_file_id(file_id)

    async def _handle_ai_message_requested(self, event: Dict[str, Any]) -> None:
        from app.workers.direct_execution_runtime import get_direct_execution_worker

        p = event.get("payload", event)
        worker = get_direct_execution_worker()
        if worker is not None and worker.is_running:
            await worker.enqueue(p)
        else:
            from app.orchestration.pipeline_executor import PipelineExecutor
            executor = PipelineExecutor()
            await executor.execute(p)

    async def _handle_ai_message_cancelled(self, event: Dict[str, Any]) -> None:
        from app.orchestration.pipeline_executor import PipelineExecutor
        from app.repositories.direct_ai_repository import DirectAIRepository
        from app.workers.direct_execution_runtime import get_direct_execution_worker

        p = event.get("payload", event)
        request_id = p.get("request_id") or p.get("messageId", "")
        if not request_id:
            return
        await DirectAIRepository().cancel_execution(request_id)
        get_direct_execution_worker().cancel_local(request_id)
        PipelineExecutor.cancel(request_id)
        log.info("Cancellation persisted and signalled for request_id=%s", request_id)

    def _dlt_topic_for(self, source_topic: str) -> str:
        if source_topic == settings.topic_file_uploaded_v2:
            return settings.topic_file_uploaded_dlt
        if source_topic == settings.topic_file_deleted_v1:
            return settings.topic_file_deleted_dlt
        return settings.topic_ai_message_requested_dlt

    def _send_to_dlt(self, record: Any, exc: Exception, correlation_id: str) -> bool:
        """Synchronously publish failed record to dead-letter topic and verify broker ack."""
        dlt_topic = self._dlt_topic_for(record.topic)
        try:
            if self._producer_factory is not None:
                producer = self._producer_factory()
            else:
                from app.streaming.response_streamer import get_producer

                producer = get_producer()
                if not producer.is_started:
                    producer.start()

            raw_val = record.value
            if isinstance(raw_val, (bytes, bytearray)):
                try:
                    serialized_payload: Any = json.loads(raw_val.decode("utf-8"))
                except Exception:
                    serialized_payload = {
                        "raw_base64": base64.b64encode(bytes(raw_val)).decode("ascii")
                    }
            else:
                serialized_payload = raw_val

            envelope = {
                "original_topic": record.topic,
                "original_partition": getattr(record, "partition", None),
                "original_offset": getattr(record, "offset", None),
                "correlation_id": correlation_id,
                "error_type": type(exc).__name__,
                "error": str(exc)[:2000],
                "failed_at": datetime.now(timezone.utc).isoformat(),
                "payload": serialized_payload,
            }
            headers = [
                ("x-original-topic", str(record.topic).encode("utf-8")),
                ("x-error-type", type(exc).__name__.encode("utf-8")),
            ]
            if correlation_id:
                headers.append(("x-correlation-id", correlation_id.encode("utf-8")))

            producer.send_sync(dlt_topic, key=record.key, value=envelope, headers=headers)
            KAFKA_DLT_TOTAL.labels(topic=dlt_topic, status="success").inc()
            log.warning(
                "Published failed record to DLT topic=%s original_topic=%s offset=%s",
                dlt_topic,
                record.topic,
                getattr(record, "offset", "?"),
            )
            return True
        except Exception as dlt_exc:  # noqa: BLE001
            KAFKA_DLT_TOTAL.labels(topic=dlt_topic, status="error").inc()
            log.error("Failed to publish record to DLT topic=%s: %s", dlt_topic, dlt_exc)
            return False
