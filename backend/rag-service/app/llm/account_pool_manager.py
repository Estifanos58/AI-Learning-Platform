from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_endpoint import ModelEndpoint
from app.models.provider_account import ProviderAccount

log = logging.getLogger(__name__)


class AccountPoolManager:
    # In-memory per-account request timestamps for minute-rate checks as fallback.
    _minute_buckets: dict[str, deque[datetime]] = defaultdict(deque)
    _redis_client: Optional[Any] = None

    @classmethod
    async def _get_redis_client(cls) -> Any | None:
        if cls._redis_client is None:
            try:
                from redis.asyncio import Redis
                from app.config import get_settings

                settings = get_settings()
                if settings.redis_url:
                    cls._redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
            except Exception as exc:
                log.warning("Could not initialize Redis client for AccountPoolManager: %s", exc)
                cls._redis_client = False
        return cls._redis_client if cls._redis_client is not False else None

    def can_use_account(self, account: ProviderAccount) -> bool:
        """Synchronous check using in-memory bucket."""
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

    async def can_use_account_async(self, account: ProviderAccount) -> bool:
        """Asynchronous distributed check using Redis sliding window with in-memory fallback."""
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
            redis = await self._get_redis_client()
            if redis is not None:
                try:
                    now_ts = now.timestamp()
                    key = f"ratelimit:account:{account.id}"
                    pipe = redis.pipeline()
                    pipe.zremrangebyscore(key, "-inf", now_ts - 60.0)
                    pipe.zcard(key)
                    res = await pipe.execute()
                    count = res[1]
                    if count >= account.rate_limit_per_minute:
                        return False
                    return True
                except Exception as exc:
                    log.warning("Redis rate limit check error: %s; falling back to in-memory", exc)

            # In-memory fallback
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

    async def mark_request_async(self, account: ProviderAccount) -> None:
        now = datetime.now(timezone.utc)
        account.last_used_at = now
        redis = await self._get_redis_client()
        if redis is not None:
            try:
                now_ts = now.timestamp()
                key = f"ratelimit:account:{account.id}"
                pipe = redis.pipeline()
                pipe.zadd(key, {str(uuid.uuid4()): now_ts})
                pipe.expire(key, 120)
                await pipe.execute()
            except Exception as exc:
                log.warning("Redis mark_request error: %s", exc)

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
        await self.mark_request_async(account)

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
