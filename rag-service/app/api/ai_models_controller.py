from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.user_key_repository import UserKeyRepository
from app.security.encryption import encrypt_key

router = APIRouter(prefix="/ai", tags=["ai-models"])


class AiModelView(BaseModel):
    model_id: str
    model_name: str
    provider: str
    context_length: int
    supports_streaming: bool
    description: str | None = None
    platform_key_available: bool
    user_key_configured: bool


class ApiKeyUpsertRequest(BaseModel):
    model_id: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1, max_length=4096)


class ApiKeyResponse(BaseModel):
    model_id: str
    status: str


def require_user_id(
    x_user_id: Annotated[str | None, Header(alias="x-user-id")] = None,
) -> str:
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user context",
        )
    return x_user_id


@router.get("/models", response_model=list[AiModelView])
async def list_models(
    user_id: Annotated[str, Depends(require_user_id)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[AiModelView]:
    repo = AIModelRepository(session)
    rows = await repo.list_active_with_user_key_flag(user_id=user_id)
    return [AiModelView(**item) for item in rows]


@router.post("/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def add_api_key(
    body: ApiKeyUpsertRequest,
    user_id: Annotated[str, Depends(require_user_id)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiKeyResponse:
    model_repo = AIModelRepository(session)
    model = await model_repo.get_by_id(body.model_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    key_repo = UserKeyRepository(session)
    encrypted = encrypt_key(body.api_key)
    await key_repo.upsert(user_id=user_id, model_id=body.model_id, encrypted_api_key=encrypted)
    return ApiKeyResponse(model_id=body.model_id, status="created")


@router.put("/api-keys/{model_id}", response_model=ApiKeyResponse)
async def update_api_key(
    model_id: str,
    body: ApiKeyUpsertRequest,
    user_id: Annotated[str, Depends(require_user_id)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiKeyResponse:
    if body.model_id != model_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="model_id in path and body must match",
        )

    model_repo = AIModelRepository(session)
    model = await model_repo.get_by_id(model_id)
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    key_repo = UserKeyRepository(session)
    encrypted = encrypt_key(body.api_key)
    await key_repo.upsert(user_id=user_id, model_id=model_id, encrypted_api_key=encrypted)
    return ApiKeyResponse(model_id=model_id, status="updated")


@router.delete("/api-keys/{model_id}", response_model=ApiKeyResponse)
async def delete_api_key(
    model_id: str,
    user_id: Annotated[str, Depends(require_user_id)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ApiKeyResponse:
    key_repo = UserKeyRepository(session)
    deleted = await key_repo.delete(user_id=user_id, model_id=model_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return ApiKeyResponse(model_id=model_id, status="deleted")
