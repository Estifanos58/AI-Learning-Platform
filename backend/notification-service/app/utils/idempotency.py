import threading
import time


class InMemoryIdempotencyStore:
    def __init__(self, ttl_seconds: int = 86400) -> None:
        self._ttl_seconds = ttl_seconds
        self._seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def is_processed(self, event_id: str) -> bool:
        now = time.time()
        with self._lock:
            self._cleanup(now)
            return event_id in self._seen

    def mark_processed(self, event_id: str) -> None:
        with self._lock:
            self._seen[event_id] = time.time() + self._ttl_seconds

    def _cleanup(self, now: float) -> None:
        expired = [event_id for event_id, expiry in self._seen.items() if expiry <= now]
        for event_id in expired:
            del self._seen[event_id]
