"""
RAG Service Configuration.
All settings are loaded from environment variables with sane defaults.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Service identity ─────────────────────────────────────────────────────
    service_name: str = Field(default="rag-service")
    service_version: str = Field(default="1.0.0")
    environment: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # ── Server ───────────────────────────────────────────────────────────────
    host: str = Field(default="0.0.0.0", alias="RAG_HOST")
    port: int = Field(default=8087, alias="RAG_PORT")
    workers: int = Field(default=1, alias="RAG_WORKERS")

    # ── Kafka ────────────────────────────────────────────────────────────────
    kafka_bootstrap_servers: str = Field(
        default="localhost:9092", alias="KAFKA_BOOTSTRAP_SERVERS"
    )
    kafka_group_id: str = Field(default="rag-service-v1", alias="KAFKA_GROUP_ID")
    kafka_auto_offset_reset: str = Field(
        default="earliest", alias="KAFKA_AUTO_OFFSET_RESET"
    )

    # Inbound topics
    topic_file_uploaded_v2: str = Field(
        default="file.uploaded.v2", alias="KAFKA_TOPIC_FILE_UPLOADED_V2"
    )
    topic_file_deleted_v1: str = Field(
        default="file.deleted.v1", alias="KAFKA_TOPIC_FILE_DELETED_V1"
    )
    topic_ai_message_requested_v2: str = Field(
        default="ai.message.requested.v2",
        alias="KAFKA_TOPIC_AI_MESSAGE_REQUESTED_V2",
    )
    topic_ai_message_cancelled_v1: str = Field(
        default="ai.message.cancelled.v1",
        alias="KAFKA_TOPIC_AI_MESSAGE_CANCELLED_V1",
    )

    # Outbound topics
    topic_ai_message_chunk_v1: str = Field(
        default="ai.message.chunk.v1", alias="KAFKA_TOPIC_AI_MESSAGE_CHUNK_V1"
    )
    topic_ai_message_completed_v1: str = Field(
        default="ai.message.completed.v1",
        alias="KAFKA_TOPIC_AI_MESSAGE_COMPLETED_V1",
    )
    topic_ai_message_failed_v1: str = Field(
        default="ai.message.failed.v1", alias="KAFKA_TOPIC_AI_MESSAGE_FAILED_V1"
    )

    # Dead-letter topics
    topic_file_uploaded_dlt: str = Field(
        default="file.uploaded.dlt.v1", alias="KAFKA_TOPIC_FILE_UPLOADED_DLT"
    )
    topic_ai_message_requested_dlt: str = Field(
        default="ai.message.requested.dlt.v1",
        alias="KAFKA_TOPIC_AI_MESSAGE_REQUESTED_DLT",
    )

    # ── File storage ─────────────────────────────────────────────────────────
    file_storage_root: str = Field(default="/data", alias="FILE_STORAGE_ROOT_PATH")
    max_file_size_mb: int = Field(default=300, alias="MAX_FILE_SIZE_MB")
    allowed_content_types: List[str] = Field(
        default=[
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "text/markdown",
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/tiff",
        ],
        alias="ALLOWED_CONTENT_TYPES",
    )

    # ── Qdrant ───────────────────────────────────────────────────────────────
    qdrant_url: str = Field(default="http://localhost:6333", alias="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(default=None, alias="QDRANT_API_KEY")
    qdrant_collection: str = Field(
        default="rag_chunks_dev", alias="QDRANT_COLLECTION"
    )
    qdrant_vector_size: int = Field(default=1024, alias="QDRANT_VECTOR_SIZE")

    # ── Embeddings (HF TEI) ──────────────────────────────────────────────────
    tei_base_url: str = Field(
        default="http://localhost:8080", alias="TEI_BASE_URL"
    )
    tei_model: str = Field(
        default="BAAI/bge-large-en-v1.5", alias="TEI_MODEL"
    )
    embedding_batch_size: int = Field(default=32, alias="EMBEDDING_BATCH_SIZE")

    # ── Chunking ─────────────────────────────────────────────────────────────
    chunk_size: int = Field(default=1000, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=150, alias="CHUNK_OVERLAP")

    # ── Retrieval ────────────────────────────────────────────────────────────
    retrieval_top_k: int = Field(default=20, alias="RETRIEVAL_TOP_K")
    reranker_top_n: int = Field(default=8, alias="RERANKER_TOP_N")
    reranker_enabled: bool = Field(default=True, alias="RERANKER_ENABLED")

    # ── gRPC (file-service) ──────────────────────────────────────────────────
    file_service_grpc_address: str = Field(
        default="localhost:9092", alias="GRPC_FILE_SERVICE_ADDRESS"
    )
    grpc_service_secret: str = Field(
        default="change-me-shared-secret", alias="APP_GRPC_SERVICE_SECRET"
    )

    # ── LLM providers ────────────────────────────────────────────────────────
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")

    deepseek_api_key: Optional[str] = Field(default=None, alias="DEEPSEEK_API_KEY")
    deepseek_model: str = Field(
        default="deepseek-chat", alias="DEEPSEEK_MODEL"
    )

    local_llm_url: Optional[str] = Field(
        default=None, alias="LOCAL_LLM_URL"
    )
    local_llm_model: str = Field(default="mistral", alias="LOCAL_LLM_MODEL")

    # ── Security ─────────────────────────────────────────────────────────────
    encryption_key: str = Field(
        default="change-me-32-byte-encryption-key!!", alias="ENCRYPTION_KEY"
    )
    max_prompt_length: int = Field(default=8000, alias="MAX_PROMPT_LENGTH")

    # ── PostgreSQL (usage / user keys) ───────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5436/rag_db",
        alias="RAG_DATABASE_URL",
    )

    # ── Feature flags ────────────────────────────────────────────────────────
    web_search_enabled: bool = Field(default=False, alias="WEB_SEARCH_ENABLED")
    kafka_consumer_enabled: bool = Field(
        default=True, alias="KAFKA_CONSUMER_ENABLED"
    )

    @field_validator("environment")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v

    def model_post_init(self, __context: object) -> None:
        """Warn if insecure defaults are used in non-development environments."""
        import logging
        _log = logging.getLogger("rag-service.config")
        if self.environment != "development":
            if self.encryption_key == "change-me-32-byte-encryption-key!!":
                raise ValueError("ENCRYPTION_KEY must be explicitly set in non-development environments")
            if self.grpc_service_secret == "change-me-shared-secret":
                _log.warning("APP_GRPC_SERVICE_SECRET is using the default insecure value")


@lru_cache
def get_settings() -> Settings:
    return Settings()
