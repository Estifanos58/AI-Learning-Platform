"""Regression and integration tests for notification-service Kafka commits, DLQ, persistent deduplication, and HTML escaping."""

from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock

from kafka.structs import TopicPartition

from app.config import Settings
from app.email.sender import EmailSender, NonRetryableNotificationError
from app.handlers.verification_handler import VerificationHandler
from app.kafka.consumer import VerificationConsumer
from app.utils.idempotency import RedisIdempotencyStore, SqliteIdempotencyStore


class _FakeRedis:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    def set(self, key: str, value: str, nx: bool = False, ex: int | None = None):
        if nx and key in self._data:
            return False
        self._data[key] = value
        return True

    def get(self, key: str):
        return self._data.get(key)

    def delete(self, key: str):
        self._data.pop(key, None)

    def ping(self) -> bool:
        return True


def _make_message(offset: int, value: bytes, topic: str = 'user.email.verification.v1'):
    return SimpleNamespace(
        topic=topic,
        partition=0,
        offset=offset,
        value=value,
        headers=[('correlationId', b'corr-notif-1')],
    )


def test_commits_offset_only_after_delivery_and_persists_deduplication(tmp_path):
    db_path = str(tmp_path / 'dedup.db')
    store = SqliteIdempotencyStore(db_path=db_path, ttl_seconds=3600)
    settings = Settings(APP_ENV='test', IDEMPOTENCY_BACKEND='sqlite', IDEMPOTENCY_SQLITE_PATH=db_path)

    sender = MagicMock()
    handler = VerificationHandler(sender, retry_delay_seconds=0.01)
    kafka_consumer = MagicMock()
    kafka_producer = MagicMock()
    consumer = VerificationConsumer(
        settings,
        handler,
        store,
        consumer=kafka_consumer,
        producer=kafka_producer,
    )

    tp = TopicPartition('user.email.verification.v1', 0)
    payload = json.dumps({
        'eventId': 'evt-100',
        'userId': 'user-1',
        'email': 'student@example.com',
        'username': 'Student',
        'verificationCode': '654321',
    }).encode('utf-8')
    msg = _make_message(offset=5, value=payload)

    assert consumer._process_message(tp, msg) is True
    sender.send_verification_email.assert_called_once_with('student@example.com', 'Student', '654321')
    committed = kafka_consumer.commit.call_args.args[0]
    assert committed[tp].offset == 6
    store.close()

    # Simulate process restart with new SQLite store pointing at same DB file
    store_after_restart = SqliteIdempotencyStore(db_path=db_path, ttl_seconds=3600)
    assert store_after_restart.is_processed('evt-100') is True
    consumer_after_restart = VerificationConsumer(
        settings,
        handler,
        store_after_restart,
        consumer=kafka_consumer,
        producer=kafka_producer,
    )
    msg_dup = _make_message(offset=6, value=payload)
    assert consumer_after_restart._process_message(tp, msg_dup) is True
    # Email must NOT be sent a second time across restart
    assert sender.send_verification_email.call_count == 1
    store_after_restart.close()


def test_does_not_commit_offset_when_dlq_publish_fails(tmp_path):
    db_path = str(tmp_path / 'dedup_dlq_fail.db')
    store = SqliteIdempotencyStore(db_path=db_path)
    settings = Settings(APP_ENV='test', IDEMPOTENCY_BACKEND='sqlite', IDEMPOTENCY_SQLITE_PATH=db_path)

    sender = MagicMock()
    sender.send_verification_email.side_effect = NonRetryableNotificationError('SMTP auth failed')
    handler = VerificationHandler(sender, retry_delay_seconds=0.01)

    kafka_consumer = MagicMock()
    kafka_producer = MagicMock()
    failing_future = MagicMock()
    failing_future.get.side_effect = RuntimeError('Kafka broker down')
    kafka_producer.send.return_value = failing_future

    consumer = VerificationConsumer(
        settings,
        handler,
        store,
        consumer=kafka_consumer,
        producer=kafka_producer,
    )
    tp = TopicPartition('user.email.verification.v1', 0)
    payload = json.dumps({
        'eventId': 'evt-fail-1',
        'userId': 'user-1',
        'email': 'student@example.com',
        'username': 'Student',
        'verificationCode': '111111',
    }).encode('utf-8')
    msg = _make_message(offset=10, value=payload)

    committed = consumer._process_message(tp, msg)
    assert committed is False
    kafka_consumer.commit.assert_not_called()
    # Event should NOT remain marked processed when delivery failed
    assert store.is_processed('evt-fail-1') is False
    store.close()


def test_commits_offset_after_confirmed_dlq_publish_for_malformed_message():
    fake_redis = _FakeRedis()
    store = RedisIdempotencyStore(redis_url='redis://unused', client=fake_redis)
    settings = Settings(APP_ENV='test', IDEMPOTENCY_BACKEND='redis')
    handler = VerificationHandler(MagicMock(), retry_delay_seconds=0.01)

    kafka_consumer = MagicMock()
    kafka_producer = MagicMock()
    ok_future = MagicMock()
    ok_future.get.return_value = SimpleNamespace(offset=1)
    kafka_producer.send.return_value = ok_future

    consumer = VerificationConsumer(
        settings,
        handler,
        store,
        consumer=kafka_consumer,
        producer=kafka_producer,
    )
    tp = TopicPartition('user.email.verification.v1', 0)
    msg = _make_message(offset=20, value=b'{invalid-json')

    assert consumer._process_message(tp, msg) is True
    kafka_producer.send.assert_called_once()
    dlq_topic, dlq_payload = kafka_producer.send.call_args.args
    assert dlq_topic == 'notification.email.failed.v1'
    assert dlq_payload['originalOffset'] == 20
    assert kafka_consumer.commit.call_args.args[0][tp].offset == 21


def test_email_sender_escapes_html_and_preserves_hash_in_smtp_password(monkeypatch):
    settings = Settings(
        APP_ENV='test',
        IDEMPOTENCY_BACKEND='redis',
        SMTP_HOST='smtp.example.com',
        SMTP_PORT=587,
        SMTP_USERNAME='mailer@example.com',
        SMTP_PASSWORD='p@ss#with#hashes',
        SMTP_FROM='no-reply@ai-learning-platform.local',
    )
    sender = EmailSender(settings)

    captured: dict[str, str] = {}

    class _FakeSMTP:
        def __init__(self, host, port, timeout=15):
            captured['host'] = host

        def __enter__(self):
            return self

        def __exit__(self, *_a):
            return False

        def ehlo(self):
            pass

        def starttls(self, context=None):
            pass

        def login(self, user, password):
            captured['password'] = password

        def sendmail(self, _from, _to, msg_str):
            captured['msg'] = msg_str

    import smtplib

    monkeypatch.setattr(smtplib, 'SMTP', _FakeSMTP)
    sender.send_verification_email('user@example.com', '<script>alert(1)</script>', '999999')

    assert captured['password'] == 'p@ss#with#hashes'
    assert '<script>alert(1)</script>' not in captured['msg'] or '&lt;script&gt;alert(1)&lt;/script&gt;' in captured['msg']
    assert 'YourCompany' not in captured['msg']
