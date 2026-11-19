"""Initial RAG service schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-18
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "ai_models" not in existing_tables:
        op.create_table(
            "ai_models",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("model_name", sa.String(length=120), nullable=False, unique=True),
            sa.Column("provider", sa.String(length=40), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("context_length", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("supports_streaming", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("platform_key_available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("encrypted_platform_key", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    if "chat_rooms" not in existing_tables:
        op.create_table(
            "chat_rooms",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_chat_rooms_user_id", "chat_rooms", ["user_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("chat_rooms") if idx.get("name")}
        if "ix_chat_rooms_user_id" not in existing_indexes:
            op.create_index("ix_chat_rooms_user_id", "chat_rooms", ["user_id"])

    if "messages" not in existing_tables:
        op.create_table(
            "messages",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "chatroom_id",
                sa.String(length=36),
                sa.ForeignKey("chat_rooms.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="COMPLETED"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_messages_chatroom_id", "messages", ["chatroom_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("messages") if idx.get("name")}
        if "ix_messages_chatroom_id" not in existing_indexes:
            op.create_index("ix_messages_chatroom_id", "messages", ["chatroom_id"])

    if "ai_executions" not in existing_tables:
        op.create_table(
            "ai_executions",
            sa.Column("request_id", sa.String(length=36), primary_key=True),
            sa.Column(
                "chatroom_id",
                sa.String(length=36),
                sa.ForeignKey("chat_rooms.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "message_id",
                sa.String(length=36),
                sa.ForeignKey("messages.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("stream_key", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("max_retries", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("error", sa.Text(), nullable=True),
        )
        op.create_index("ix_ai_executions_chatroom_id", "ai_executions", ["chatroom_id"])
        op.create_index("ix_ai_executions_message_id", "ai_executions", ["message_id"])
        op.create_index("ix_ai_executions_user_id", "ai_executions", ["user_id"])
        op.create_index("ix_ai_executions_status", "ai_executions", ["status"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("ai_executions") if idx.get("name")}
        for idx_name, col_names in [
            ("ix_ai_executions_chatroom_id", ["chatroom_id"]),
            ("ix_ai_executions_message_id", ["message_id"]),
            ("ix_ai_executions_user_id", ["user_id"]),
            ("ix_ai_executions_status", ["status"]),
        ]:
            if idx_name not in existing_indexes:
                op.create_index(idx_name, "ai_executions", col_names)

    if "model_definitions" not in existing_tables:
        op.create_table(
            "model_definitions",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("model_name", sa.String(length=120), nullable=False, unique=True),
            sa.Column("family", sa.String(length=80), nullable=False),
            sa.Column("context_length", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("capabilities", sa.JSON(), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_model_definitions_model_name", "model_definitions", ["model_name"], unique=True)
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("model_definitions") if idx.get("name")}
        if "ix_model_definitions_model_name" not in existing_indexes:
            op.create_index("ix_model_definitions_model_name", "model_definitions", ["model_name"], unique=True)

    if "model_providers" not in existing_tables:
        op.create_table(
            "model_providers",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "model_definition_id",
                sa.String(length=36),
                sa.ForeignKey("model_definitions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("provider_name", sa.String(length=40), nullable=False),
            sa.Column("provider_model_name", sa.String(length=120), nullable=False),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint(
                "model_definition_id",
                "provider_name",
                "provider_model_name",
                name="uq_model_provider_mapping",
            ),
        )
        op.create_index("ix_model_providers_model_definition_id", "model_providers", ["model_definition_id"])
        op.create_index("ix_model_providers_provider_name", "model_providers", ["provider_name"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("model_providers") if idx.get("name")}
        if "ix_model_providers_model_definition_id" not in existing_indexes:
            op.create_index("ix_model_providers_model_definition_id", "model_providers", ["model_definition_id"])
        if "ix_model_providers_provider_name" not in existing_indexes:
            op.create_index("ix_model_providers_provider_name", "model_providers", ["provider_name"])

    if "provider_accounts" not in existing_tables:
        op.create_table(
            "provider_accounts",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("provider_name", sa.String(length=40), nullable=False),
            sa.Column("account_label", sa.String(length=120), nullable=False),
            sa.Column("encrypted_api_key", sa.Text(), nullable=False),
            sa.Column("rate_limit_per_minute", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("daily_quota", sa.Integer(), nullable=False, server_default="200000"),
            sa.Column("used_today", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_reset_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("health_status", sa.String(length=20), nullable=False, server_default="healthy"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("provider_name", "account_label", name="uq_provider_account_label"),
        )
        op.create_index("ix_provider_accounts_provider_name", "provider_accounts", ["provider_name"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("provider_accounts") if idx.get("name")}
        if "ix_provider_accounts_provider_name" not in existing_indexes:
            op.create_index("ix_provider_accounts_provider_name", "provider_accounts", ["provider_name"])

    if "model_endpoints" not in existing_tables:
        op.create_table(
            "model_endpoints",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(
                "model_provider_id",
                sa.String(length=36),
                sa.ForeignKey("model_providers.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "provider_account_id",
                sa.String(length=36),
                sa.ForeignKey("provider_accounts.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("weight", sa.Float(), nullable=False, server_default="1.0"),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("health_status", sa.String(length=20), nullable=False, server_default="healthy"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("model_provider_id", "provider_account_id", name="uq_model_endpoint"),
        )
        op.create_index("ix_model_endpoints_model_provider_id", "model_endpoints", ["model_provider_id"])
        op.create_index("ix_model_endpoints_provider_account_id", "model_endpoints", ["provider_account_id"])
    else:
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("model_endpoints") if idx.get("name")}
        if "ix_model_endpoints_model_provider_id" not in existing_indexes:
            op.create_index("ix_model_endpoints_model_provider_id", "model_endpoints", ["model_provider_id"])
        if "ix_model_endpoints_provider_account_id" not in existing_indexes:
            op.create_index("ix_model_endpoints_provider_account_id", "model_endpoints", ["provider_account_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    for table_name in [
        "model_endpoints",
        "provider_accounts",
        "model_providers",
        "model_definitions",
        "ai_executions",
        "messages",
        "chat_rooms",
        "ai_models",
    ]:
        if table_name in existing_tables:
            op.drop_table(table_name)
