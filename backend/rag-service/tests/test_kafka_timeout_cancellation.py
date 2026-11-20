"""Tests for Kafka record timeout handling and coroutine cancellation in KafkaConsumer."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest

from app.ingestion.kafka_consumer import IngestionConsumer


class DummyRecord:
    def __init__(self, topic: str, value: bytes, offset: int = 10, partition: int = 0):
        self.topic = topic
        self.value = value
        self.offset = offset
        self.partition = partition
        self.headers = []


@pytest.mark.asyncio
async def test_kafka_timeout_cancels_asyncio_task():
    loop = asyncio.get_running_loop()
    producer_mock = MagicMock()
    consumer_service = IngestionConsumer(
        event_loop=loop,
        producer_factory=lambda: producer_mock,
        record_timeout_seconds=0.1,
    )

    task_started = asyncio.Event()
    task_cancelled = asyncio.Event()

    async def hanging_handler(topic, payload, correlation_id):
        task_started.set()
        try:
            await asyncio.sleep(5.0)
        except asyncio.CancelledError:
            task_cancelled.set()
            raise

    consumer_service._dispatch_with_correlation = hanging_handler
    consumer_service._send_to_dlt = MagicMock(return_value=True)
    consumer_service._commit_record_offset = MagicMock()

    mock_consumer = MagicMock()
    record = DummyRecord(topic="file.uploaded", value=b'{"file_id": "test-f1"}')

    # Run in a separate thread, exactly as the consumer thread does
    def run_process():
        return consumer_service._process_single_record(mock_consumer, "tp-1", record)

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as pool:
        future = pool.submit(run_process)
        # Wait for coroutine to start
        await asyncio.wait_for(task_started.wait(), timeout=1.0)
        # Wait for timeout and result from thread
        result = await loop.run_in_executor(None, future.result)

    # Coroutine on the event loop MUST have received CancelledError!
    await asyncio.wait_for(task_cancelled.wait(), timeout=1.0)
    assert task_cancelled.is_set()

    # DLT was sent and offset committed after timeout
    assert result is True
    consumer_service._send_to_dlt.assert_called_once()
    consumer_service._commit_record_offset.assert_called_once()
