from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.repositories.model_orchestration_repository import EndpointCandidate


@dataclass
class SelectedEndpoint:
    endpoint_id: str
    account_id: str
    provider_name: str
    provider_model_name: str
    api_key_encrypted: str
    score: float


class EndpointSelector:
    def __init__(self) -> None:
        self._throttle_window = timedelta(minutes=1)

    def select_best(self, candidates: list[EndpointCandidate]) -> SelectedEndpoint | None:
        now = datetime.now(timezone.utc)
        scored: list[SelectedEndpoint] = []

        for candidate in candidates:
            if not self._is_eligible(candidate, now):
                continue

            score = self._score(candidate, now)
            scored.append(
                SelectedEndpoint(
                    endpoint_id=candidate.endpoint_id,
                    account_id=candidate.account_id,
                    provider_name=candidate.provider_name,
                    provider_model_name=candidate.provider_model_name,
                    api_key_encrypted=candidate.api_key_encrypted,
                    score=score,
                )
            )

        if not scored:
            return None

        scored.sort(key=lambda item: item.score, reverse=True)
        return scored[0]

    def _is_eligible(self, candidate: EndpointCandidate, now: datetime) -> bool:
        if candidate.account_health_status in {"disabled"}:
            return False
        if candidate.endpoint_health_status in {"disabled"}:
            return False

        if candidate.account_daily_quota > 0 and candidate.account_used_today >= candidate.account_daily_quota:
            return False

        if candidate.account_health_status == "throttled" and candidate.account_last_used_at is not None:
            if self._to_utc(candidate.account_last_used_at) + self._throttle_window > now:
                return False

        return True

    def _score(self, candidate: EndpointCandidate, now: datetime) -> float:
        weight = max(0.0, min(float(candidate.weight), 1.0))

        if candidate.account_daily_quota <= 0:
            remaining_quota_ratio = 1.0
        else:
            remaining_quota_ratio = max(
                0.0,
                min(
                    1.0,
                    (candidate.account_daily_quota - candidate.account_used_today)
                    / float(candidate.account_daily_quota),
                ),
            )

        recency_penalty = self._recency_penalty(candidate.endpoint_last_used_at, now)
        health_score = self._health_score(candidate.account_health_status, candidate.endpoint_health_status)

        return (
            weight * 0.4
            + remaining_quota_ratio * 0.3
            + recency_penalty * 0.2
            + health_score * 0.1
        )

    def _recency_penalty(self, last_used_at: object | None, now: datetime) -> float:
        if last_used_at is None:
            return 1.0

        age_seconds = (now - self._to_utc(last_used_at)).total_seconds()
        if age_seconds <= 0:
            return 0.0

        # Older endpoint use gets a higher score up to 5 minutes.
        return max(0.0, min(1.0, age_seconds / 300.0))

    def _health_score(self, account_status: str, endpoint_status: str) -> float:
        values = {
            "healthy": 1.0,
            "degraded": 0.6,
            "throttled": 0.2,
            "disabled": 0.0,
        }
        return min(values.get(account_status, 0.4), values.get(endpoint_status, 0.4))

    def _to_utc(self, value: object) -> datetime:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        return datetime.now(timezone.utc)
