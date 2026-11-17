from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_endpoint import ModelEndpoint
from app.models.provider_account import ProviderAccount


class AccountPoolManager:
    # In-memory per-account request timestamps for minute-rate checks.
    _minute_buckets: dict[str, deque[datetime]] = defaultdict(deque)

    def can_use_account(self, account: ProviderAccount) -> bool:
        if not account.is_active:
            return False
        if account.health_status == "disabled":
            return False

        now = datetime.now(timezone.utc)
        if account.last_reset_at and self._to_utc(account.last_reset_at) + timedelta(hours=24) <= now:
            account.used_today = 0
            account.last_reset_at = now

        if account.daily_quota > 0 and account.used_today >= account.daily_quota:
            return False

        if account.health_status == "throttled" and account.last_used_at is not None:
            if self._to_utc(account.last_used_at) + timedelta(minutes=1) > now:
                return False

        if account.rate_limit_per_minute > 0:
            bucket = self._minute_buckets[account.id]
            while bucket and bucket[0] <= now - timedelta(minutes=1):
                bucket.popleft()
            if len(bucket) >= account.rate_limit_per_minute:
                return False

        return True

    def mark_request(self, account: ProviderAccount) -> None:
        now = datetime.now(timezone.utc)
        account.last_used_at = now
        bucket = self._minute_buckets[account.id]
        bucket.append(now)

    async def mark_success(
        self,
        session: AsyncSession,
        endpoint_id: str,
        account_id: str,
        tokens_used: int,
    ) -> None:
        now = datetime.now(timezone.utc)
        endpoint = await session.get(ModelEndpoint, endpoint_id)
        account = await session.get(ProviderAccount, account_id)
        if endpoint is None or account is None:
            return

        endpoint.last_used_at = now
        endpoint.health_status = "healthy"

        account.last_used_at = now
        account.health_status = "healthy"
        account.used_today = max(0, int(account.used_today or 0) + max(0, tokens_used))
        self.mark_request(account)

        await session.commit()

    async def mark_throttled(self, session: AsyncSession, endpoint_id: str, account_id: str) -> None:
        now = datetime.now(timezone.utc)
        endpoint = await session.get(ModelEndpoint, endpoint_id)
        account = await session.get(ProviderAccount, account_id)
        if endpoint is None or account is None:
            return

        endpoint.health_status = "throttled"
        account.health_status = "throttled"
        account.last_used_at = now
        await session.commit()

    async def mark_unauthorized(self, session: AsyncSession, endpoint_id: str, account_id: str) -> None:
        endpoint = await session.get(ModelEndpoint, endpoint_id)
        account = await session.get(ProviderAccount, account_id)
        if endpoint is None or account is None:
            return

        endpoint.active = False
        endpoint.health_status = "disabled"
        account.is_active = False
        account.health_status = "disabled"
        await session.commit()

    async def mark_timeout(self, session: AsyncSession, endpoint_id: str, account_id: str) -> None:
        endpoint = await session.get(ModelEndpoint, endpoint_id)
        account = await session.get(ProviderAccount, account_id)
        if endpoint is None or account is None:
            return

        endpoint.health_status = "degraded"
        if account.health_status != "disabled":
            account.health_status = "degraded"
        await session.commit()

    def _to_utc(self, value: object) -> datetime:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)
        return datetime.now(timezone.utc)
