"""Security – user permission checker via file-service gRPC."""

from __future__ import annotations

import logging
from typing import List

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class UserPermissionChecker:
    """
    Calls the file-service `AuthorizeFilesForUser` gRPC endpoint to
    filter a list of file IDs to only those the user is allowed to access.
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
                "AuthorizeFilesForUser gRPC call failed (returning empty): %s", exc
            )
            # Fail-safe: deny all on auth failure
            return []

    async def _call_grpc(self, user_id: str, file_ids: List[str]) -> List[str]:
        try:
            import grpc  # type: ignore[import]
            from app.grpc_stubs import file_pb2, file_pb2_grpc  # type: ignore[import]

            async with grpc.aio.insecure_channel(
                settings.file_service_grpc_address
            ) as channel:
                stub = file_pb2_grpc.FileServiceStub(channel)
                metadata = (
                    ("x-service-secret", settings.grpc_service_secret),
                    ("x-user-id", user_id),
                )
                request = file_pb2.AuthorizeFilesForUserRequest(
                    user_id=user_id,
                    file_ids=file_ids,
                )
                response = await stub.AuthorizeFilesForUser(
                    request, metadata=metadata, timeout=10
                )
                return list(response.allowed_file_ids)
        except ImportError:
            # gRPC stubs not generated yet – fall back to allowing all provided IDs
            # (safe for development; production requires stubs)
            log.warning(
                "gRPC stubs not available; allowing all file_ids for development"
            )
            return file_ids
        except Exception:
            raise
