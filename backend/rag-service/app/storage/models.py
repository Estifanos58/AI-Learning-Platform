"""Storage – Pydantic models for vector payloads and ingestion state."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class IngestionStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ChunkPayload(BaseModel):
    """Metadata stored alongside every Qdrant vector point."""

    chunk_id: str
    file_id: str
    owner_id: str
    user_id: str
    folder_id: Optional[str] = None
    page_number: Optional[int] = None
    chunk_index: int
    chunk_text: str
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    embedding_model: str
    schema_version: str = "1"
    extraction_version: str = "1"

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")


class IngestionRecord(BaseModel):
    """In-memory / DB record tracking ingestion progress per file."""

    file_id: str
    owner_id: str
    status: IngestionStatus = IngestionStatus.PENDING
    chunk_count: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class UserApiKey(BaseModel):
    """Encrypted provider API key stored per user."""

    id: str
    user_id: str
    provider: str
    encrypted_api_key: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UsageRecord(BaseModel):
    """Token usage and cost recorded per inference request."""

    user_id: str
    request_id: str
    model_used: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_estimate: float = 0.0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
