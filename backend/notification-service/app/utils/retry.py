from __future__ import annotations

import time
from typing import Callable, Tuple, Type, TypeVar

T = TypeVar('T')


def retry_with_exponential_backoff(
    fn: Callable[[], T],
    retries: int = 3,
    initial_delay_seconds: float = 1.0,
    non_retryable: Tuple[Type[BaseException], ...] = (),
) -> T:
    delay = initial_delay_seconds
    for attempt in range(1, max(1, retries) + 1):
        try:
            return fn()
        except BaseException as exc:
            if non_retryable and isinstance(exc, non_retryable):
                raise
            if attempt >= retries:
                raise
            time.sleep(delay)
            delay *= 2

    raise RuntimeError('Retry loop ended unexpectedly')
