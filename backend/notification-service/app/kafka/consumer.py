import json
import logging
import threading
import time
from typing import Any

from kafka import KafkaConsumer, KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import KafkaError, TopicAlreadyExistsError

from app.config import Settings
from app.handlers.verification_handler import VerificationHandler
from app.utils.idempotency import InMemoryIdempotencyStore

logger = logging.getLogger(__name__)


class VerificationConsumer:
    def __init__(
        self,
        settings: Settings,
        verification_handler: VerificationHandler,
        idempotency_store: InMemoryIdempotencyStore,
    ) -> None:
        self._settings = settings
        self._verification_handler = verification_handler
        self._idempotency_store = idempotency_store
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

        self._consumer = KafkaConsumer(
            settings.kafka_topic_email_verification,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id=settings.kafka_group_id,
            enable_auto_commit=True,
            auto_offset_reset='earliest',
            consumer_timeout_ms=1000,
        )
        self._producer = KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda payload: json.dumps(payload).encode('utf-8'),
        )
        self._ensure_topic_exists(self._settings.kafka_topic_email_verification)
        self._ensure_topic_exists(self._settings.kafka_topic_email_failed)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._run, daemon=True, name='verification-consumer')
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._consumer.close()
        self._producer.close()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                for message in self._consumer:
                    if self._stop_event.is_set():
                        break
                    self._process_message(message)
            except Exception as exc:
                logger.exception('Kafka consumer loop failed and will retry: %s', exc)
                time.sleep(1)

    def _process_message(self, message: Any) -> None:
        payload = self._parse_payload(message.value)
        event_id = self._get_field(payload, 'eventId', 'event_id')
        user_id = self._get_field(payload, 'userId', 'user_id')
        email = self._get_field(payload, 'email').strip().lower()

        correlation_id = self._extract_correlation_id(message)

        logger.info(
            json.dumps(
                {
                    'message': 'notification_event_received',
                    'correlationId': correlation_id,
                    'eventId': event_id,
                    'userId': user_id,
                    'email': email,
                    'topic': getattr(message, 'topic', ''),
                    'partition': getattr(message, 'partition', None),
                    'offset': getattr(message, 'offset', None),
                }
            )
        )

        if not event_id:
            logger.error(
                json.dumps(
                    {
                        'message': 'notification_event_missing_id',
                        'correlationId': correlation_id,
                        'userId': user_id,
                        'email': email,
                    }
                )
            )
            return

        if self._idempotency_store.is_processed(event_id):
            logger.info(
                json.dumps(
                    {
                        'message': 'notification_event_already_processed',
                        'correlationId': correlation_id,
                        'eventId': event_id,
                        'userId': user_id,
                        'email': email,
                    }
                )
            )
            return

        try:
            self._verification_handler.handle(payload, correlation_id)
            self._idempotency_store.mark_processed(event_id)
        except Exception as exc:
            logger.error(
                json.dumps(
                    {
                        'message': 'verification_email_failed',
                        'correlationId': correlation_id,
                        'eventId': event_id,
                        'userId': user_id,
                        'email': email,
                        'error': str(exc),
                    }
                )
            )
            self._publish_dead_letter(payload, correlation_id, str(exc))

    def _publish_dead_letter(self, payload: dict[str, Any], correlation_id: str, error: str) -> None:
        dead_letter_payload = {
            'correlationId': correlation_id,
            'error': error,
            'payload': payload,
        }
        try:
            future = self._producer.send(self._settings.kafka_topic_email_failed, dead_letter_payload)
            future.get(timeout=10)
            self._producer.flush()
        except KafkaError as exc:
            logger.error(
                json.dumps(
                    {
                        'message': 'dead_letter_publish_failed',
                        'topic': self._settings.kafka_topic_email_failed,
                        'correlationId': correlation_id,
                        'error': str(exc),
                    }
                )
            )

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
            if key == 'correlationId' and value is not None:
                return value.decode('utf-8', errors='ignore')
        return ''

    def _parse_payload(self, value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value

        if isinstance(value, (bytes, bytearray)):
            try:
                decoded = value.decode('utf-8')
            except Exception as exc:
                logger.error('Failed to decode Kafka payload as UTF-8: %s', exc)
                return {}

            try:
                parsed = json.loads(decoded)
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                logger.error('Failed to parse Kafka payload as JSON: %s', decoded)
                return {}

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                logger.error('Failed to parse Kafka string payload as JSON: %s', value)
                return {}

        logger.error('Unsupported Kafka payload type: %s', type(value).__name__)
        return {}

    def _get_field(self, payload: dict[str, Any], *names: str) -> str:
        for name in names:
            value = payload.get(name)
            if value is not None:
                return str(value)
        return ''
