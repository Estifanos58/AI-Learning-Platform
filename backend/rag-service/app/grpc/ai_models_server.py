from __future__ import annotations

import importlib
import json
import logging
import uuid
from datetime import datetime

import grpc  # type: ignore[import]

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.grpc_stubs.loader import ensure_ai_models_stubs, ensure_rag_stubs
from app.ingestion.chunker import RecursiveCharacterTextSplitter
from app.ingestion.embedding_pipeline import EmbeddingPipeline
from app.ingestion.extractor import TextExtractor
from app.ingestion.file_loader import FileLoader
from app.llm.provider_executor import ProviderExecutor
from app.orchestration.pipeline_executor import PipelineExecutor
from app.repositories.direct_ai_repository import DirectAIRepository
from app.repositories.model_orchestration_repository import (
    DuplicateModelDefinitionError,
    ModelOrchestrationRepository,
)
from app.retrieval.reranker import Reranker
from app.retrieval.vector_search import VectorSearch
from app.security.encryption import encrypt_key
from app.security.user_permission_checker import UserPermissionChecker
from app.storage.qdrant_client import get_qdrant_client
from app.streaming.response_streamer import ResponseStreamer
from app.workers.direct_execution_runtime import get_direct_execution_worker

log = logging.getLogger(__name__)
settings = get_settings()


def _format_dt(value: object | None) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return ""


def _metadata_value(context: grpc.aio.ServicerContext, key: str) -> str:
    for item_key, value in context.invocation_metadata():
        if item_key == key:
            return value
    return ""


async def _require_service_auth(context: grpc.aio.ServicerContext) -> str:
    service_secret = _metadata_value(context, "x-service-secret")
    user_id = _metadata_value(context, "x-user-id")

    if service_secret != settings.grpc_service_secret:
        await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid service secret")
    if not user_id:
        await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing user id")
    return user_id


class _AiModelService:
    async def ListModels(self, request, context):  # noqa: N802
        await _require_service_auth(context)

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            models = await repo.list_models()

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        model_items = [
            pb2.AiModelDto(
                model_id=item["model_id"],
                model_name=item["model_name"],
                family=item["family"],
                context_length=item["context_length"],
                capabilities_json=json.dumps(item.get("capabilities") or {}),
                active=bool(item.get("active", True)),
                provider_count=int(item.get("provider_count") or 0),
            )
            for item in models
        ]
        return pb2.ListModelsResponse(models=model_items)

    async def CreateModelDefinition(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        model_name = (request.model_name or "").strip()
        family = (request.family or "").strip()
        if not model_name or not family:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "model_name and family are required",
            )

        try:
            capabilities = json.loads(request.capabilities_json or "{}")
        except json.JSONDecodeError:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "capabilities_json must be valid JSON")

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            try:
                model = await repo.create_model_definition(
                    model_name=model_name,
                    family=family,
                    context_length=max(0, int(request.context_length or 0)),
                    capabilities=capabilities if isinstance(capabilities, dict) else {},
                    active=bool(request.active),
                )
            except DuplicateModelDefinitionError as exc:
                await context.abort(grpc.StatusCode.ALREADY_EXISTS, str(exc))

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        dto = pb2.AiModelDto(
            model_id=model.id,
            model_name=model.model_name,
            family=model.family,
            context_length=model.context_length,
            capabilities_json=json.dumps(model.capabilities or {}),
            active=model.active,
            provider_count=0,
        )
        return pb2.ModelDefinitionResponse(model=dto, status="created")

    async def AttachProviderToModel(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        if not request.model_id or not request.provider_name or not request.provider_model_name:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "model_id, provider_name and provider_model_name are required",
            )

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            model = await repo.get_model_definition(request.model_id)
            if model is None:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Model not found")

            provider = await repo.attach_provider(
                model_definition_id=request.model_id,
                provider_name=request.provider_name.lower(),
                provider_model_name=request.provider_model_name,
                priority=int(request.priority or 100),
                active=bool(request.active),
            )
            await repo.ensure_endpoints_for_provider(provider.id)

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        provider_dto = pb2.ModelProviderDto(
            provider_id=provider.id,
            model_id=provider.model_definition_id,
            provider_name=provider.provider_name,
            provider_model_name=provider.provider_model_name,
            priority=provider.priority,
            active=provider.active,
        )
        return pb2.ModelProviderResponse(provider=provider_dto, status="created")

    async def CreateProviderAccount(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        if not request.provider_name or not request.account_label or not request.api_key:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "provider_name, account_label and api_key are required",
            )

        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            account = await repo.create_provider_account(
                provider_name=request.provider_name.lower(),
                account_label=request.account_label,
                encrypted_api_key=encrypt_key(request.api_key),
                rate_limit_per_minute=max(1, int(request.rate_limit_per_minute or 60)),
                daily_quota=max(1, int(request.daily_quota or 200000)),
                is_active=bool(request.is_active),
            )

            providers = await repo.list_providers(model_id=None)
            for provider in providers:
                if provider.provider_name == account.provider_name:
                    await repo.ensure_endpoints_for_provider(provider.id)

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        dto = pb2.ProviderAccountDto(
            account_id=account.id,
            provider_name=account.provider_name,
            account_label=account.account_label,
            rate_limit_per_minute=account.rate_limit_per_minute,
            daily_quota=account.daily_quota,
            used_today=account.used_today,
            last_used_at="",
            last_reset_at=_format_dt(account.last_reset_at),
            is_active=account.is_active,
            health_status=account.health_status,
        )
        return pb2.ProviderAccountResponse(account=dto, status="created")

    async def ListProviders(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        model_id = request.model_id or None
        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            providers = await repo.list_providers(model_id=model_id)

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        items = [
            pb2.ModelProviderDto(
                provider_id=item.id,
                model_id=item.model_definition_id,
                provider_name=item.provider_name,
                provider_model_name=item.provider_model_name,
                priority=item.priority,
                active=item.active,
            )
            for item in providers
        ]
        return pb2.ListProvidersResponse(providers=items)

    async def ListAccounts(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        provider_name = (request.provider_name or "").lower() or None
        async with AsyncSessionLocal() as session:
            repo = ModelOrchestrationRepository(session)
            accounts = await repo.list_accounts(provider_name=provider_name)

        pb2 = importlib.import_module("app.grpc_stubs.ai_models_pb2")
        items = [
            pb2.ProviderAccountDto(
                account_id=item.id,
                provider_name=item.provider_name,
                account_label=item.account_label,
                rate_limit_per_minute=item.rate_limit_per_minute,
                daily_quota=item.daily_quota,
                used_today=item.used_today,
                last_used_at=_format_dt(item.last_used_at),
                last_reset_at=_format_dt(item.last_reset_at),
                is_active=item.is_active,
                health_status=item.health_status,
            )
            for item in accounts
        ]
        return pb2.ListAccountsResponse(accounts=items)


class _RagService:
    def __init__(self) -> None:
        self._direct_repo = DirectAIRepository()
        self._streamer = ResponseStreamer()

    async def IngestFile(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.file_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "file_id is required")
        if not request.storage_path:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "storage_path is required")
        if not request.content_type:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "content_type is required")

        owner_id = request.owner_id or user_id
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        try:
            loader = FileLoader()
            extractor = TextExtractor()
            splitter = RecursiveCharacterTextSplitter()
            pipeline = EmbeddingPipeline()

            content = loader.load(request.storage_path)
            result = extractor.extract(content, request.content_type, request.file_name)
            chunks = splitter.split(result.text)
            count = await pipeline.embed_and_store(
                chunks=chunks,
                file_id=request.file_id,
                owner_id=owner_id,
                user_id=user_id,
                folder_id=request.folder_id or None,
                extraction_version=result.extraction_version,
            )
            return pb2.IngestFileResponse(
                status="ok",
                file_id=request.file_id,
                chunks_stored=count,
            )
        except FileNotFoundError as exc:
            await context.abort(grpc.StatusCode.NOT_FOUND, str(exc))
        except PermissionError as exc:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, str(exc))
        except Exception as exc:  # noqa: BLE001
            log.error("Ingestion error: %s", exc)
            await context.abort(grpc.StatusCode.INTERNAL, "Ingestion failed")

    async def RetrieveChunks(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.query:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "query is required")

        perm = UserPermissionChecker()
        allowed = await perm.get_allowed_file_ids(user_id, list(request.file_ids))

        searcher = VectorSearch()
        top_k = request.top_k if request.top_k > 0 else None
        raw = await searcher.search(request.query, allowed, top_k=top_k)

        reranker = Reranker()
        final = await reranker.rerank(request.query, raw)

        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        chunks = []
        for item in final:
            payload = item.get("payload", {})
            score = item.get("score")
            page_number = payload.get("page_number")
            chunks.append(
                pb2.RetrievedChunk(
                    score=float(score) if score is not None else 0.0,
                    file_id=str(payload.get("file_id") or ""),
                    page_number=int(page_number) if page_number is not None else 0,
                    chunk_text_preview=str(payload.get("chunk_text") or "")[:300],
                )
            )

        return pb2.RetrieveChunksResponse(
            query=request.query,
            chunk_count=len(chunks),
            chunks=chunks,
        )

    async def DeleteFileVectors(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        if not request.file_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "file_id is required")

        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        try:
            await get_qdrant_client().delete_by_file_id(request.file_id)
            return pb2.DeleteFileVectorsResponse(status="ok", file_id=request.file_id)
        except Exception as exc:  # noqa: BLE001
            log.error("Vector deletion error: %s", exc)
            await context.abort(grpc.StatusCode.INTERNAL, "Vector deletion failed")

    async def CancelGeneration(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        if not request.request_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        PipelineExecutor.cancel(request.request_id)
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        return pb2.CancelGenerationResponse(
            status="cancellation_requested",
            request_id=request.request_id,
        )

    async def ExecuteDirect(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        prompt = (request.prompt or "").strip()
        if not prompt:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "prompt is required")
        if not (request.ai_model_id or "").strip():
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "ai_model_id is required")

        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        request_id = (request.request_id or request.message_id or str(uuid.uuid4())).strip()

        mode = "deep"
        if request.mode == pb2.CHAT:
            mode = "chat"

        try:
            chatroom = await self._direct_repo.resolve_or_create_chatroom(user_id, request.chatroom_id or None)
            await self._direct_repo.set_chatroom_title_if_empty(chatroom.id, prompt)
            _, assistant_message = await self._direct_repo.create_user_and_assistant_messages(
                chatroom_id=chatroom.id,
                user_prompt=prompt,
            )
        except PermissionError:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Chatroom not found")

        stream_key = f"stream:ai:{request_id}"
        await self._direct_repo.create_execution(
            request_id=request_id,
            chatroom_id=chatroom.id,
            message_id=assistant_message.id,
            user_id=user_id,
            stream_key=stream_key,
        )

        payload = {
            "request_id": request_id,
            "message_id": assistant_message.id,
            "chatroom_id": chatroom.id,
            "user_id": user_id,
            "ai_model_id": request.ai_model_id,
            "content": prompt,
            "file_ids": list(request.file_ids),
            "options": dict(request.options),
            "mode": mode,
        }
        await get_direct_execution_worker().enqueue(payload)

        return pb2.ExecuteAcceptedResponse(
            status="accepted",
            request_id=request_id,
            stream_key=stream_key,
            accepted=True,
            chatroom_id=chatroom.id,
            message_id=assistant_message.id,
        )

    async def GetExecution(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.execution_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "execution_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        execution = await self._direct_repo.get_execution_for_user(request.execution_id, user_id)
        if execution is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Execution not found")

        return pb2.GetExecutionResponse(
            execution_id=execution.request_id,
            chatroom_id=execution.chatroom_id,
            message_id=execution.message_id,
            status=execution.status,
            error=execution.error or "",
            created_at=_format_dt(execution.created_at),
            completed_at=_format_dt(execution.completed_at),
            stream_key=execution.stream_key,
        )

    async def CancelExecution(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.execution_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "execution_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        execution = await self._direct_repo.get_execution_for_user(request.execution_id, user_id)
        if execution is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Execution not found")

        await self._direct_repo.cancel_execution(request.execution_id)
        PipelineExecutor.cancel(request.execution_id)
        await self._streamer.publish_cancelled(
            chatroom_id=execution.chatroom_id,
            message_id=execution.message_id,
            request_id=execution.request_id,
        )
        return pb2.CancelExecutionResponse(
            status="cancelled",
            execution_id=request.execution_id,
        )

    async def GetExecutionStreamBootstrap(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.execution_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "execution_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        execution = await self._direct_repo.get_execution_for_user(request.execution_id, user_id)
        if execution is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Execution not found")

        message = await self._direct_repo.get_message(execution.message_id)
        partial_content = message.content if message is not None else ""
        final_content = partial_content if execution.status == "COMPLETED" else ""

        return pb2.GetExecutionStreamBootstrapResponse(
            status=execution.status,
            execution_id=execution.request_id,
            chatroom_id=execution.chatroom_id,
            message_id=execution.message_id,
            stream_key=execution.stream_key,
            partial_content=partial_content,
            final_content=final_content,
            error=execution.error or "",
        )

    async def ListChatrooms(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        rooms, total = await self._direct_repo.list_chatrooms(
            user_id=user_id,
            page=max(0, int(request.page or 0)),
            size=max(1, int(request.size or 20)),
        )
        return pb2.ListChatroomsResponse(
            chatrooms=[
                pb2.ChatroomDto(
                    id=room.id,
                    title=room.title or "",
                    created_at=_format_dt(room.created_at),
                    updated_at=_format_dt(room.updated_at),
                )
                for room in rooms
            ],
            total=total,
        )

    async def GetChatroom(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.chatroom_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "chatroom_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        room = await self._direct_repo.get_chatroom_for_user(user_id, request.chatroom_id)
        if room is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Chatroom not found")
        messages = await self._direct_repo.list_all_chatroom_messages(user_id, request.chatroom_id)

        return pb2.GetChatroomResponse(
            chatroom=pb2.ChatroomDto(
                id=room.id,
                title=room.title or "",
                created_at=_format_dt(room.created_at),
                updated_at=_format_dt(room.updated_at),
            ),
            messages=[
                pb2.MessageDto(
                    id=msg.id,
                    chatroom_id=msg.chatroom_id,
                    role=msg.role,
                    content=msg.content,
                    status=msg.status,
                    created_at=_format_dt(msg.created_at),
                    updated_at=_format_dt(msg.updated_at),
                )
                for msg in messages
            ],
        )

    async def ListChatroomMessages(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.chatroom_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "chatroom_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        try:
            messages, total = await self._direct_repo.list_chatroom_messages(
                user_id=user_id,
                chatroom_id=request.chatroom_id,
                page=max(0, int(request.page or 0)),
                size=max(1, int(request.size or 50)),
            )
        except PermissionError:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Chatroom not found")

        return pb2.ListChatroomMessagesResponse(
            messages=[
                pb2.MessageDto(
                    id=msg.id,
                    chatroom_id=msg.chatroom_id,
                    role=msg.role,
                    content=msg.content,
                    status=msg.status,
                    created_at=_format_dt(msg.created_at),
                    updated_at=_format_dt(msg.updated_at),
                )
                for msg in messages
            ],
            total=total,
        )

    async def UpdateChatroomTitle(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.chatroom_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "chatroom_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        try:
            room = await self._direct_repo.update_chatroom_title(user_id, request.chatroom_id, request.title)
        except ValueError:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "title is required")
        except PermissionError:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Chatroom not found")

        return pb2.ChatroomDto(
            id=room.id,
            title=room.title or "",
            created_at=_format_dt(room.created_at),
            updated_at=_format_dt(room.updated_at),
        )

    async def DeleteChatroom(self, request, context):  # noqa: N802
        user_id = await _require_service_auth(context)
        if not request.chatroom_id:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "chatroom_id is required")
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")

        try:
            await self._direct_repo.delete_chatroom(user_id, request.chatroom_id)
        except PermissionError:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Chatroom not found")
        return pb2.DeleteChatroomResponse(status="deleted", chatroom_id=request.chatroom_id)

    async def ListProviders(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        executor = ProviderExecutor()
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        return pb2.ListProvidersResponse(
            available_providers=executor.supported_providers()
        )

    async def CollectionInfo(self, request, context):  # noqa: N802
        await _require_service_auth(context)
        pb2 = importlib.import_module("app.grpc_stubs.rag_pb2")
        try:
            client = get_qdrant_client()
            raw_client = await client._get_client()
            info = await raw_client.get_collection(settings.qdrant_collection)
            vectors_count = getattr(info, "vectors_count", None)
            return pb2.CollectionInfoResponse(
                collection=settings.qdrant_collection,
                vectors_count=int(vectors_count) if vectors_count is not None else 0,
                status=str(getattr(info, "status", "unknown")),
                error="",
            )
        except Exception as exc:  # noqa: BLE001
            return pb2.CollectionInfoResponse(
                collection=settings.qdrant_collection,
                vectors_count=0,
                status="unknown",
                error=str(exc),
            )


class AiModelsGrpcServer:
    def __init__(self) -> None:
        ensure_ai_models_stubs()
        ensure_rag_stubs()
        self.server = grpc.aio.server()
        pb2_grpc = importlib.import_module("app.grpc_stubs.ai_models_pb2_grpc")
        rag_pb2_grpc = importlib.import_module("app.grpc_stubs.rag_pb2_grpc")
        pb2_grpc.add_AiModelServiceServicer_to_server(_AiModelService(), self.server)
        rag_pb2_grpc.add_RagServiceServicer_to_server(_RagService(), self.server)
        self.bind_addr = f"{settings.rag_grpc_host}:{settings.rag_grpc_port}"
        self.server.add_insecure_port(self.bind_addr)

    async def start(self) -> None:
        await self.server.start()
        log.info("RAG gRPC server started on %s", self.bind_addr)

    async def stop(self) -> None:
        await self.server.stop(grace=5)
        log.info("RAG gRPC server stopped")
