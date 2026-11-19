from __future__ import annotations

import base64
import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

from kafka import KafkaConsumer, KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import KafkaError, TopicAlreadyExistsError
from kafka.structs import OffsetAndMetadata

from app.config import Settings
from app.handlers.verification_handler import VerificationHandler
from app.observability import (
    NOTIFICATION_DLQ_TOTAL,
    NOTIFICATION_PROCESSED_TOTAL,
    mask_email,
    reset_correlation_id,
    set_correlation_id,
)
from app.utils.idempotency import IdempotencyStore

logger = logging.getLogger(__name__)


class VerificationConsumer:
    """
    Manual-commit Kafka consumer for email verification notifications.

    Guarantees:
      - enable_auto_commit=False
      - Persistent deduplication via IdempotencyStore (Redis/SQLite)
      - Offsets are committed per record (record.offset + 1) ONLY AFTER:
          1. Successful email delivery + persistent deduplication mark, OR
          2. Event already persistently marked as processed, OR
          3. Confirmed broker-acknowledged publication to the dead-letter topic.
      - If dead-letter publication fails, the offset is NOT committed so Kafka redelivers.
    """

    def __init__(
        self,
        settings: Settings,
        verification_handler: VerificationHandler,
        idempotency_store: IdempotencyStore,
        *,
        consumer: Any | None = None,
        producer: Any | None = None,
    ) -> None:
        self._settings = settings
        self._verification_handler = verification_handler
        self._idempotency_store = idempotency_store
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._connected = False

        self._consumer = consumer or KafkaConsumer(
            settings.kafka_topic_email_verification,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id=settings.kafka_group_id,
            enable_auto_commit=False,
            auto_offset_reset='earliest',
            max_poll_interval_ms=300000,
        )
        self._producer = producer or KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            acks='all',
            retries=3,
            value_serializer=lambda payload: json.dumps(payload).encode('utf-8'),
        )
        self._connected = True
        if consumer is None and settings.kafka_auto_create_topics:
            self._ensure_topic_exists(self._settings.kafka_topic_email_verification)
            self._ensure_topic_exists(self._settings.kafka_topic_email_failed)

    @property
    def is_alive(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    @property
    def is_connected(self) -> bool:
        return self._connected and self.is_alive

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._run, daemon=True, name='verification-consumer')
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._connected = False
        if self._thread:
            self._thread.join(timeout=5)
        try:
            self._consumer.close()
        except Exception:  # noqa: BLE001
            pass
        try:
            self._producer.flush(timeout=5)
            self._producer.close()
        except Exception:  # noqa: BLE001
            pass

    def _run(self) -> None:
        poll_ms = max(100, int(self._settings.consumer_poll_timeout_seconds * 1000))
        while not self._stop_event.is_set():
            try:
                batch = self._consumer.poll(timeout_ms=poll_ms, max_records=10)
                if not batch:
                    continue
                for tp, messages in batch.items():
                    abort_partition = False
                    for message in messages:
                        if self._stop_event.is_set():
                            break
                        committed = self._process_message(tp, message)
                        if not committed:
                            abort_partition = True
                            break
                    if abort_partition:
                        time.sleep(1)
                        break
            except Exception as exc:  # noqa: BLE001
                logger.exception('Kafka consumer loop failed and will retry: %s', exc)
                time.sleep(1)

    def _process_message(self, tp: Any, message: Any) -> bool:
        """
        Process a single Kafka message and commit its exact offset only upon confirmed completion or DLQ ack.
        Returns True if the offset was committed, False if left uncommitted for retry/redelivery.
        """
        correlation_id = self._extract_correlation_id(message)
        corr_token = set_correlation_id(correlation_id)
        try:
            try:
                payload = self._parse_payload(message.value)
            except ValueError as parse_exc:
                NOTIFICATION_PROCESSED_TOTAL.labels(status='malformed').inc()
                logger.error(
                    'notification_event_malformed topic=%s partition=%s offset=%s error=%s',
                    getattr(message, 'topic', ''),
                    getattr(message, 'partition', None),
                    getattr(message, 'offset', None),
                    parse_exc,
                )
                return self._handle_dlq_and_commit(
                    tp,
                    message,
                    raw_or_payload=self._safe_dlq_payload(message.value),
                    event_id='',
                    correlation_id=correlation_id,
                    exc=parse_exc,
                )

            event_id = self._get_field(payload, 'eventId', 'event_id').strip()
            user_id = self._get_field(payload, 'userId', 'user_id').strip()
            email = self._get_field(payload, 'email').strip().lower()

            logger.info(
                'notification_event_received eventId=%s userId=%s email=%s topic=%s partition=%s offset=%s',
                event_id,
                user_id,
                mask_email(email),
                getattr(message, 'topic', ''),
                getattr(message, 'partition', None),
                getattr(message, 'offset', None),
            )

            if not event_id:
                NOTIFICATION_PROCESSED_TOTAL.labels(status='invalid').inc()
                err = ValueError('Notification event missing required eventId')
                logger.error('notification_event_missing_id userId=%s email=%s', user_id, mask_email(email))
                return self._handle_dlq_and_commit(
                    tp,
                    message,
                    raw_or_payload=payload,
                    event_id='',
                    correlation_id=correlation_id,
                    exc=err,
                )

            if self._idempotency_store.is_processed(event_id):
                NOTIFICATION_PROCESSED_TOTAL.labels(status='deduplicated').inc()
                logger.info('notification_event_already_processed eventId=%s userId=%s', event_id, user_id)
                self._commit_offset(tp, message)
                return True

            if not self._idempotency_store.claim(event_id):
                if self._idempotency_store.is_processed(event_id):
                    NOTIFICATION_PROCESSED_TOTAL.labels(status='deduplicated').inc()
                    self._commit_offset(tp, message)
                    return True
                logger.warning(
                    'notification_event_in_progress_elsewhere eventId=%s; skipping commit for safe redelivery',
                    event_id,
                )
                return False

            try:
                self._verification_handler.handle(payload, correlation_id)
                self._idempotency_store.mark_processed(event_id)
                self._commit_offset(tp, message)
                NOTIFICATION_PROCESSED_TOTAL.labels(status='delivered').inc()
                return True
            except Exception as exc:  # noqa: BLE001
                self._idempotency_store.release(event_id)
                NOTIFICATION_PROCESSED_TOTAL.labels(status='failed').inc()
                logger.error(
                    'verification_email_failed eventId=%s userId=%s email=%s error=%s',
                    event_id,
                    user_id,
                    mask_email(email),
                    exc,
                )
                return self._handle_dlq_and_commit(
                    tp,
                    message,
                    raw_or_payload=payload,
                    event_id=event_id,
                    correlation_id=correlation_id,
                    exc=exc,
                )
        finally:
            reset_correlation_id(corr_token)

    def _handle_dlq_and_commit(
        self,
        tp: Any,
        message: Any,
        *,
        raw_or_payload: Any,
        event_id: str,
        correlation_id: str,
        exc: Exception,
    ) -> bool:
        if self._publish_dead_letter(
            payload=raw_or_payload,
            event_id=event_id,
            correlation_id=correlation_id,
            exc=exc,
            message=message,
        ):
            self._commit_offset(tp, message)
            return True

        logger.error(
            'dead_letter_publish_failed_offset_not_committed eventId=%s topic=%s partition=%s offset=%s',
            event_id,
            getattr(message, 'topic', ''),
            getattr(message, 'partition', None),
            getattr(message, 'offset', None),
        )
        return False

    def _commit_offset(self, tp: Any, message: Any) -> None:
        try:
            meta = OffsetAndMetadata(message.offset + 1, '')
        except TypeError:
            meta = OffsetAndMetadata(message.offset + 1, '', -1)
        self._consumer.commit({tp: meta})

    def _publish_dead_letter(
        self,
        *,
        payload: Any,
        event_id: str,
        correlation_id: str,
        exc: Exception,
        message: Any,
    ) -> bool:
        dead_letter_payload = {
            'eventId': event_id,
            'correlationId': correlation_id,
            'originalTopic': getattr(message, 'topic', ''),
            'originalPartition': getattr(message, 'partition', None),
            'originalOffset': getattr(message, 'offset', None),
            'failedAt': datetime.now(timezone.utc).isoformat(),
            'errorType': type(exc).__name__,
            'error': str(exc)[:2000],
            'payload': payload,
        }
        try:
            future = self._producer.send(self._settings.kafka_topic_email_failed, dead_letter_payload)
            future.get(timeout=10)
            self._producer.flush(timeout=10)
            NOTIFICATION_DLQ_TOTAL.labels(status='success').inc()
            return True
        except Exception as dlq_exc:  # noqa: BLE001
            NOTIFICATION_DLQ_TOTAL.labels(status='error').inc()
            logger.error(
                'dead_letter_publish_failed topic=%s eventId=%s error=%s',
                self._settings.kafka_topic_email_failed,
                event_id,
                dlq_exc,
            )
            return False

    def _ensure_topic_exists(self, topic_name: str) -> None:
        admin = KafkaAdminClient(bootstrap_servers=self._settings.kafka_bootstrap_servers)
        try:
            topic = NewTopic(name=topic_name, num_partitions=1, replication_factor=1)
            admin.create_topics(new_topics=[topic], validate_only=False)
            logger.info('Created Kafka topic: %s', topic_name)
        except TopicAlreadyExistsError:
            logger.info('Kafka topic already exists: %s', topic_name)
        except KafkaError as exc:
            logger.warning('Could not auto-create Kafka topic %s: %s', topic_name, exc)
        finally:
            admin.close()

    def _extract_correlation_id(self, message: Any) -> str:
        headers = getattr(message, 'headers', None) or []
        for key, value in headers:
            if key and key.lower() in {'correlationid', 'correlation_id', 'x-correlation-id'} and value is not None:
                return value.decode('utf-8', errors='ignore') if isinstance(value, (bytes, bytearray)) else str(value)
        return ''

    def _parse_payload(self, value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, (bytes, bytearray)):
            try:
                decoded = value.decode('utf-8')
            except Exception as exc:
                raise ValueError('Failed to decode Kafka payload as UTF-8') from exc
            try:
                parsed = json.loads(decoded)
            except json.JSONDecodeError as exc:
                raise ValueError('Failed to parse Kafka payload as JSON') from exc
            if not isinstance(parsed, dict):
                raise ValueError('Kafka JSON payload must be an object')
            return parsed
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError as exc:
                raise ValueError('Failed to parse Kafka string payload as JSON') from exc
            if not isinstance(parsed, dict):
                raise ValueError('Kafka JSON payload must be an object')
            return parsed
        raise ValueError(f'Unsupported Kafka payload type: {type(value).__name__}')

    def _safe_dlq_payload(self, raw_value: Any) -> dict[str, Any]:
        if isinstance(raw_value, (bytes, bytearray)):
            return {'rawBase64': base64.b64encode(bytes(raw_value)).decode('ascii')}
        return {'rawValue': str(raw_value)[:1000]}

    def _get_field(self, payload: dict[str, Any], *names: str) -> str:
        for name in names:
            value = payload.get(name)
            if value is not None:
                return str(value)
        return ''
