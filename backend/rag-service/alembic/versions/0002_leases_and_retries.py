"""Add worker leases, heartbeats, retry scheduling, and optimistic locking to ai_executions.

Revision ID: 0002_leases_and_retries
Revises: 0001_initial_schema
Create Date: 2026-11-18
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_leases_and_retries"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "ai_executions" not in existing_tables:
        return

    existing_columns = {col["name"] for col in inspector.get_columns("ai_executions")}
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("ai_executions") if idx.get("name")}

    if "worker_id" not in existing_columns:
        op.add_column("ai_executions", sa.Column("worker_id", sa.String(length=128), nullable=True))
    if "claimed_at" not in existing_columns:
        op.add_column("ai_executions", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True))
    if "heartbeat_at" not in existing_columns:
        op.add_column("ai_executions", sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True))
    if "lease_expires_at" not in existing_columns:
        op.add_column("ai_executions", sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True))
    if "next_retry_at" not in existing_columns:
        op.add_column("ai_executions", sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True))
    if "last_error_code" not in existing_columns:
        op.add_column("ai_executions", sa.Column("last_error_code", sa.String(length=64), nullable=True))
    if "version" not in existing_columns:
        op.add_column(
            "ai_executions",
            sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        )
    if "ix_ai_executions_worker_id" not in existing_indexes:
        op.create_index("ix_ai_executions_worker_id", "ai_executions", ["worker_id"])
    if "ix_ai_executions_claim_schedule" not in existing_indexes:
        op.create_index(
            "ix_ai_executions_claim_schedule",
            "ai_executions",
            ["status", "lease_expires_at", "next_retry_at"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "ai_executions" not in existing_tables:
        return

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("ai_executions") if idx.get("name")}
    existing_columns = {col["name"] for col in inspector.get_columns("ai_executions")}

    if "ix_ai_executions_claim_schedule" in existing_indexes:
        op.drop_index("ix_ai_executions_claim_schedule", table_name="ai_executions")
    if "ix_ai_executions_worker_id" in existing_indexes:
        op.drop_index("ix_ai_executions_worker_id", table_name="ai_executions")

    for col in [
        "version",
        "last_error_code",
        "next_retry_at",
        "lease_expires_at",
        "heartbeat_at",
        "claimed_at",
        "worker_id",
    ]:
        if col in existing_columns:
            op.drop_column("ai_executions", col)
