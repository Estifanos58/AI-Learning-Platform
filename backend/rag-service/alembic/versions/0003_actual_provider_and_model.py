"""Add actual_provider and actual_model columns to ai_executions for failover tracking.

Revision ID: 0003_actual_provider_and_model
Revises: 0002_leases_and_retries
Create Date: 2026-11-20
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_actual_provider_and_model"
down_revision: Union[str, None] = "0002_leases_and_retries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "ai_executions" not in existing_tables:
        return

    existing_columns = {col["name"] for col in inspector.get_columns("ai_executions")}

    if "actual_provider" not in existing_columns:
        op.add_column("ai_executions", sa.Column("actual_provider", sa.String(length=64), nullable=True))
    if "actual_model" not in existing_columns:
        op.add_column("ai_executions", sa.Column("actual_model", sa.String(length=128), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "ai_executions" not in existing_tables:
        return

    existing_columns = {col["name"] for col in inspector.get_columns("ai_executions")}
    if "actual_model" in existing_columns:
        op.drop_column("ai_executions", "actual_model")
    if "actual_provider" in existing_columns:
        op.drop_column("ai_executions", "actual_provider")
