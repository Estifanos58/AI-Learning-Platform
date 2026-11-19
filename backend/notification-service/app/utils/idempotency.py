from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Protocol


class IdempotencyStore(Protocol):
    def claim(self, event_id: str) -> bool:
        """Atomically claim `event_id` for processing. Returns False if already claimed/processed."""

    def is_processed(self, event_id: str) -> bool:
        """Return True if `event_id` has already been processed."""

    def mark_processed(self, event_id: str) -> None:
        """Persist `event_id` as completed for the configured TTL."""

    def release(self, event_id: str) -> None:
        """Release an in-progress claim on processing failure."""

    def ping(self) -> None:
        """Verify persistence backend health."""

    def close(self) -> None:
        """Release underlying connections."""


class RedisIdempotencyStore:
    """
    Persistent, multi-instance deduplication store backed by Redis.
    Uses atomic SET NX EX so concurrent consumers across replicas never deliver duplicates.
    """

    def __init__(
        self,
        redis_url: str,
        ttl_seconds: int = 86400,
        processing_ttl_seconds: int = 300,
        key_prefix: str = 'notification:idempotency:',
        client: object | None = None,
    ) -> None:
        self._ttl_seconds = max(60, ttl_seconds)
        self._processing_ttl_seconds = max(30, processing_ttl_seconds)
        self._key_prefix = key_prefix
        if client is not None:
            self._redis = client
        else:
            import redis

            self._redis = redis.Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )

    def _key(self, event_id: str) -> str:
        return f'{self._key_prefix}{event_id}'

    def claim(self, event_id: str) -> bool:
        result = self._redis.set(
            self._key(event_id),
            'processing',
            nx=True,
            ex=self._processing_ttl_seconds,
        )
        return bool(result)

    def is_processed(self, event_id: str) -> bool:
        val = self._redis.get(self._key(event_id))
        return val == 'processed'

    def mark_processed(self, event_id: str) -> None:
        self._redis.set(self._key(event_id), 'processed', ex=self._ttl_seconds)

    def release(self, event_id: str) -> None:
        # Only delete if not already finalized as processed
        key = self._key(event_id)
        if self._redis.get(key) == 'processing':
            self._redis.delete(key)

    def ping(self) -> None:
        if not self._redis.ping():
            raise RuntimeError('Redis ping returned False')

    def close(self) -> None:
        close_fn = getattr(self._redis, 'close', None)
        if callable(close_fn):
            close_fn()


class SqliteIdempotencyStore:
    """
    Persistent SQLite-backed deduplication store (useful for standalone deployments and integration tests).
    """

    def __init__(
        self,
        db_path: str,
        ttl_seconds: int = 86400,
        processing_ttl_seconds: int = 300,
    ) -> None:
        self._db_path = db_path
        self._ttl_seconds = max(60, ttl_seconds)
        self._processing_ttl_seconds = max(30, processing_ttl_seconds)
        self._lock = threading.Lock()
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.execute('PRAGMA journal_mode=WAL')
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notification_idempotency (
                event_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
            """
        )
        self._conn.commit()

    def _cleanup_expired(self, now: float) -> None:
        self._conn.execute('DELETE FROM notification_idempotency WHERE expires_at <= ?', (now,))

    def claim(self, event_id: str) -> bool:
        now = time.time()
        with self._lock:
            self._cleanup_expired(now)
            cur = self._conn.execute(
                'INSERT OR IGNORE INTO notification_idempotency (event_id, state, expires_at) VALUES (?, ?, ?)',
                (event_id, 'processing', now + self._processing_ttl_seconds),
            )
            self._conn.commit()
            return cur.rowcount == 1

    def is_processed(self, event_id: str) -> bool:
        now = time.time()
        with self._lock:
            self._cleanup_expired(now)
            row = self._conn.execute(
                'SELECT state FROM notification_idempotency WHERE event_id = ? AND expires_at > ?',
                (event_id, now),
            ).fetchone()
            self._conn.commit()
            return row is not None and row[0] == 'processed'

    def mark_processed(self, event_id: str) -> None:
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO notification_idempotency (event_id, state, expires_at)
                VALUES (?, 'processed', ?)
                ON CONFLICT(event_id) DO UPDATE SET state = 'processed', expires_at = excluded.expires_at
                """,
                (event_id, now + self._ttl_seconds),
            )
            self._conn.commit()

    def release(self, event_id: str) -> None:
        with self._lock:
            self._conn.execute(
                "DELETE FROM notification_idempotency WHERE event_id = ? AND state = 'processing'",
                (event_id,),
            )
            self._conn.commit()

    def ping(self) -> None:
        with self._lock:
            self._conn.execute('SELECT 1').fetchone()

    def close(self) -> None:
        with self._lock:
            self._conn.close()


def create_idempotency_store(settings: object) -> IdempotencyStore:
    backend = getattr(settings, 'idempotency_backend', 'redis').strip().lower()
    ttl = int(getattr(settings, 'idempotency_ttl_seconds', 86400))
    proc_ttl = int(getattr(settings, 'idempotency_processing_ttl_seconds', 300))
    if backend == 'redis':
        return RedisIdempotencyStore(
            redis_url=getattr(settings, 'redis_url'),
            ttl_seconds=ttl,
            processing_ttl_seconds=proc_ttl,
        )
    return SqliteIdempotencyStore(
        db_path=getattr(settings, 'idempotency_sqlite_path'),
        ttl_seconds=ttl,
        processing_ttl_seconds=proc_ttl,
    )
