from __future__ import annotations

import importlib
import logging

import grpc  # type: ignore[import]

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.grpc_stubs.loader import ensure_ai_models_stubs
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.user_key_repository import UserKeyRepository
from app.security.encryption import encrypt_key

log = logging.getLogger(__name__)
settings = get_settings()


def _metadata_value(context: grpc.aio.ServicerContext, key: str) -> str:
    for item_key, value in context.invocation_metadata():
        if item_key == key:
            return value
    return ""


class _AiModelService:
    async def ListModels(self, request, context):  # noqa: N802
        service_secret = _metadata_value(context, "x-service-secret")
        user_id = _metadata_value(context, "x-user-id")

        if service_secret != settings.grpc_service_secret:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid service secret")
        if not user_id:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing user id")

        async with AsyncSessionLocal() as session:
            repo = AIModelRepository(session)
            models = await repo.list_active_with_user_key_flag(user_id)

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        model_items = [
            pb2.AiModelDto(
                model_id=item["model_id"],
                model_name=item["model_name"],
                provider=item["provider"],
                context_length=item["context_length"],
                supports_streaming=item["supports_streaming"],
                user_key_configured=item["user_key_configured"],
                platform_key_available=item["platform_key_available"],
                description=item.get("description") or "",
            )
            for item in models
        ]
        return pb2.ListModelsResponse(models=model_items)

    async def CreateUserApiKey(self, request, context):  # noqa: N802
        return await self._upsert_key(request, context, status_text="created")

    async def UpdateUserApiKey(self, request, context):  # noqa: N802
        return await self._upsert_key(request, context, status_text="updated")

    async def DeleteUserApiKey(self, request, context):  # noqa: N802
        service_secret = _metadata_value(context, "x-service-secret")
        user_id = _metadata_value(context, "x-user-id")
        if service_secret != settings.grpc_service_secret:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid service secret")
        if not user_id:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing user id")
        if not request.model_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "model_id is required")

        async with AsyncSessionLocal() as session:
            key_repo = UserKeyRepository(session)
            deleted = await key_repo.delete(user_id=user_id, model_id=request.model_id)

        if not deleted:
            await context.abort(grpc.StatusCode.NOT_FOUND, "API key not found")

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        return pb2.ApiKeyResponse(model_id=request.model_id, status="deleted")

    async def _upsert_key(self, request, context, status_text: str):
        service_secret = _metadata_value(context, "x-service-secret")
        user_id = _metadata_value(context, "x-user-id")

        if service_secret != settings.grpc_service_secret:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid service secret")
        if not user_id:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing user id")
        if not request.model_id or not request.api_key:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "model_id and api_key are required")

        async with AsyncSessionLocal() as session:
            model_repo = AIModelRepository(session)
            model = await model_repo.get_by_id(request.model_id)
            if model is None:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Model not found")

            encrypted = encrypt_key(request.api_key)
            key_repo = UserKeyRepository(session)
            await key_repo.upsert(
                user_id=user_id,
                model_id=request.model_id,
                encrypted_api_key=encrypted,
            )

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        return pb2.ApiKeyResponse(model_id=request.model_id, status=status_text)


class AiModelsGrpcServer:
    def __init__(self) -> None:
        ensure_ai_models_stubs()
        self.server = grpc.aio.server()
        pb2_grpc = importlib.import_module("app.grpc_stubs.ai_models_pb2_grpc")
        pb2_grpc.add_AiModelServiceServicer_to_server(_AiModelService(), self.server)
        self.bind_addr = f"{settings.rag_grpc_host}:{settings.rag_grpc_port}"
        self.server.add_insecure_port(self.bind_addr)

    async def start(self) -> None:
        await self.server.start()
        log.info("RAG gRPC server started on %s", self.bind_addr)

    async def stop(self) -> None:
        await self.server.stop(grace=5)
        log.info("RAG gRPC server stopped")
