import time
from typing import Callable, TypeVar


T = TypeVar('T')


def retry_with_exponential_backoff(
    fn: Callable[[], T],
    retries: int = 3,
    initial_delay_seconds: float = 1.0,
) -> T:
    delay = initial_delay_seconds
    for attempt in range(1, retries + 1):
        try:
            return fn()
        except Exception:
            if attempt == retries:
                raise
            time.sleep(delay)
            delay *= 2

    raise RuntimeError('Retry loop ended unexpectedly')
