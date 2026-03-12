"""Usage – credit accounting per user."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.storage.models import UsageRecord

log = logging.getLogger(__name__)


class CreditManager:
    """
    Records per-inference usage.
    In production, this writes to a PostgreSQL usage table.
    """

    async def record(
        self,
        user_id: str,
        request_id: str,
        model_used: str,
        usage: Dict[str, Any],
    ) -> None:
        record = UsageRecord(
            user_id=user_id,
            request_id=request_id,
            model_used=model_used,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            cost_estimate=usage.get("cost_estimate", 0.0),
        )
        log.info(
            "Usage recorded: user=%s request=%s tokens=%d cost=$%.6f",
            record.user_id,
            record.request_id,
            record.total_tokens,
            record.cost_estimate,
        )

    async def has_quota(self, user_id: str, estimated_tokens: int) -> bool:
        """Check whether the user has enough credits to proceed."""
        # TODO: implement real quota check against DB
        return True
