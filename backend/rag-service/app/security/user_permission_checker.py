"""Security – user permission checker via file-service gRPC (strict fail-closed)."""

from __future__ import annotations

import logging
from typing import List

from app.config import get_settings
from app.observability import get_correlation_id

log = logging.getLogger(__name__)


class UserPermissionChecker:
    """
    Calls the file-service `AuthorizeFilesForUser` gRPC endpoint to
    filter a list of file IDs to only those the user is allowed to access.
    Always fails closed when authorization cannot be verified.
    """

    async def get_allowed_file_ids(
        self, user_id: str, file_ids: List[str]
    ) -> List[str]:
        """Return the subset of `file_ids` that `user_id` is authorized to access."""
        if not file_ids:
            return []

        try:
            return await self._call_grpc(user_id, file_ids)
        except Exception as exc:  # noqa: BLE001
            log.error(
                "AuthorizeFilesForUser gRPC call failed (failing closed, returning empty): %s",
                exc,
            )
            return []

    async def _call_grpc(self, user_id: str, file_ids: List[str]) -> List[str]:
        import grpc  # type: ignore[import]

        from app.grpc_stubs.loader import ensure_file_stubs

        ensure_file_stubs()
        from app.grpc_stubs import file_pb2, file_pb2_grpc  # type: ignore[import]

        settings = get_settings()
        metadata = [
            ("x-service-secret", settings.grpc_service_secret),
            ("x-user-id", user_id),
        ]
        corr_id = get_correlation_id()
        if corr_id:
            metadata.append(("x-correlation-id", corr_id))

        async with grpc.aio.insecure_channel(
            settings.file_service_grpc_address
        ) as channel:
            stub = file_pb2_grpc.FileServiceStub(channel)
            request = file_pb2.AuthorizeFilesForUserRequest(
                user_id=user_id,
                file_ids=file_ids,
            )
            response = await stub.AuthorizeFilesForUser(
                request, metadata=tuple(metadata), timeout=10
            )
            return list(response.allowed_file_ids)
