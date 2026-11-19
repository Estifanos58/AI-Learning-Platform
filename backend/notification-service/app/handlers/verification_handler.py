from __future__ import annotations

import logging
import time
from typing import Any

from app.email.sender import EmailSender, NonRetryableNotificationError
from app.observability import NOTIFICATION_DELIVERY_LATENCY, mask_email
from app.utils.retry import retry_with_exponential_backoff

logger = logging.getLogger(__name__)


class VerificationHandler:
    def __init__(self, email_sender: EmailSender, *, retry_delay_seconds: float = 1.0) -> None:
        self._email_sender = email_sender
        self._retry_delay_seconds = retry_delay_seconds

    def handle(self, payload: dict[str, Any], correlation_id: str) -> None:
        event_id = self._field(payload, 'eventId', 'event_id')
        user_id = self._field(payload, 'userId', 'user_id')
        email = self._field(payload, 'email').strip().lower()
        username = self._field(payload, 'username').strip() or 'User'
        verification_code = self._field(payload, 'verificationCode', 'verification_code', 'code').strip()

        if not event_id or not user_id or not email or not verification_code:
            raise ValueError('Event payload is missing required fields')

        def _send() -> None:
            self._email_sender.send_verification_email(email, username, verification_code)

        start = time.monotonic()
        retry_with_exponential_backoff(
            _send,
            retries=3,
            initial_delay_seconds=self._retry_delay_seconds,
            non_retryable=(ValueError, NonRetryableNotificationError),
        )
        NOTIFICATION_DELIVERY_LATENCY.observe(time.monotonic() - start)

        logger.info(
            'verification_email_sent eventId=%s userId=%s email=%s correlationId=%s',
            event_id,
            user_id,
            mask_email(email),
            correlation_id,
        )

    def _field(self, payload: dict[str, Any], *names: str) -> str:
        for name in names:
            value = payload.get(name)
            if value is not None:
                return str(value)
        return ''
