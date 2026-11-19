"""Regression tests for RAG Kafka consumer manual per-record offset commits and DLT semantics."""

from __future__ import annotations

import asyncio
import threading
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import MagicMock

from kafka.structs import TopicPartition

from app.ingestion.kafka_consumer import IngestionConsumer


@contextmanager
def _running_event_loop():
    loop = asyncio.new_event_loop()
    thread = threading.Thread(target=loop.run_forever, daemon=True)
    thread.start()
    try:
        yield loop
    finally:
        loop.call_soon_threadsafe(loop.stop)
        thread.join(timeout=5)
        loop.close()


def _make_record(topic: str, partition: int, offset: int, value: bytes, key: str = "k1"):
    return SimpleNamespace(
        topic=topic,
        partition=partition,
        offset=offset,
        value=value,
        key=key,
        headers=[("x-correlation-id", b"corr-kafka-1")],
    )


def test_commits_exact_per_record_offset_not_entire_batch():
    with _running_event_loop() as loop:
        consumer_mock = MagicMock()
        producer_mock = MagicMock()
        rag_consumer = IngestionConsumer(
            loop,
            producer_factory=lambda: producer_mock,
            record_timeout_seconds=5.0,
        )

        processed = []

        async def fake_dispatch(topic, payload):
            processed.append((topic, payload))
            if payload.get("fail"):
                raise RuntimeError("boom")

        rag_consumer._dispatch = fake_dispatch  # type: ignore[method-assign]

        tp = TopicPartition("file.uploaded.v2", 0)
        rec0 = _make_record("file.uploaded.v2", 0, 10, b'{"file_id":"f1"}')
        rec1 = _make_record("file.uploaded.v2", 0, 11, b'{"file_id":"f2","fail":true}')

        # First record succeeds -> commits exact offset 11 (10 + 1)
        assert rag_consumer._process_single_record(consumer_mock, tp, rec0) is True
        first_commit_arg = consumer_mock.commit.call_args_list[0].args[0]
        assert tp in first_commit_arg
        assert first_commit_arg[tp].offset == 11

        # Second record fails, DLT succeeds -> commits exact offset 12 (11 + 1)
        assert rag_consumer._process_single_record(consumer_mock, tp, rec1) is True
        producer_mock.send_sync.assert_called_once()
        dlt_topic = producer_mock.send_sync.call_args.args[0]
        assert dlt_topic == "file.uploaded.dlt.v1"
        second_commit_arg = consumer_mock.commit.call_args_list[1].args[0]
        assert second_commit_arg[tp].offset == 12


def test_does_not_commit_offset_when_dlt_publish_fails():
    with _running_event_loop() as loop:
        consumer_mock = MagicMock()
        producer_mock = MagicMock()
        producer_mock.send_sync.side_effect = RuntimeError("Kafka broker unavailable")
        rag_consumer = IngestionConsumer(
            loop,
            producer_factory=lambda: producer_mock,
            record_timeout_seconds=5.0,
        )

        async def always_fail(_topic, _payload):
            raise ValueError("Corrupt ingestion")

        rag_consumer._dispatch = always_fail  # type: ignore[method-assign]

        tp = TopicPartition("file.uploaded.v2", 0)
        rec = _make_record("file.uploaded.v2", 0, 42, b'{"file_id":"f-bad"}')

        committed = rag_consumer._process_single_record(consumer_mock, tp, rec)
        assert committed is False
        consumer_mock.commit.assert_not_called()


def test_malformed_json_routes_to_dlt_and_commits_only_after_dlt_ack():
    with _running_event_loop() as loop:
        consumer_mock = MagicMock()
        producer_mock = MagicMock()
        rag_consumer = IngestionConsumer(
            loop,
            producer_factory=lambda: producer_mock,
            record_timeout_seconds=5.0,
        )

        tp = TopicPartition("ai.message.requested.v2", 1)
        rec = _make_record("ai.message.requested.v2", 1, 7, b"{not-valid-json")

        committed = rag_consumer._process_single_record(consumer_mock, tp, rec)
        assert committed is True
        producer_mock.send_sync.assert_called_once()
        committed_map = consumer_mock.commit.call_args.args[0]
        assert committed_map[tp].offset == 8
