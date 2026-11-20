"""Tests that Alembic migrations upgrade cleanly from base to head and downgrade cleanly."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_upgrade_and_downgrade(tmp_path):
    service_root = Path(__file__).resolve().parents[1]
    db_file = tmp_path / "alembic_test.db"
    alembic_cfg = Config(str(service_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(service_root / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")

    command.upgrade(alembic_cfg, "head")

    sync_engine = create_engine(f"sqlite:///{db_file}")
    try:
        inspector = inspect(sync_engine)
        tables = set(inspector.get_table_names())
        expected_tables = {
            "ai_models",
            "chat_rooms",
            "messages",
            "ai_executions",
            "model_definitions",
            "model_providers",
            "provider_accounts",
            "model_endpoints",
            "alembic_version",
        }
        assert expected_tables.issubset(tables)

        exec_columns = {col["name"] for col in inspector.get_columns("ai_executions")}
        assert {
            "worker_id",
            "claimed_at",
            "heartbeat_at",
            "lease_expires_at",
            "next_retry_at",
            "last_error_code",
            "version",
            "actual_provider",
            "actual_model",
        }.issubset(exec_columns)
    finally:
        sync_engine.dispose()

    command.downgrade(alembic_cfg, "base")


def test_alembic_upgrade_idempotent_when_tables_preexist(tmp_path):
    """Verifies upgrading succeeds even when initial schema tables already exist without alembic_version."""
    from sqlalchemy import text

    service_root = Path(__file__).resolve().parents[1]
    db_file = tmp_path / "alembic_idempotent_test.db"
    alembic_cfg = Config(str(service_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(service_root / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_file}")

    # Step 1: create initial schema tables
    command.upgrade(alembic_cfg, "0001_initial_schema")

    # Step 2: drop alembic_version to simulate pre-existing un-stamped tables
    sync_engine = create_engine(f"sqlite:///{db_file}")
    try:
        with sync_engine.begin() as conn:
            conn.execute(text("DROP TABLE alembic_version"))
    finally:
        sync_engine.dispose()

    # Step 3: upgrade to head should succeed idempotently
    command.upgrade(alembic_cfg, "head")

    sync_engine = create_engine(f"sqlite:///{db_file}")
    try:
        inspector = inspect(sync_engine)
        exec_columns = {col["name"] for col in inspector.get_columns("ai_executions")}
        assert "worker_id" in exec_columns
        assert "claimed_at" in exec_columns
    finally:
        sync_engine.dispose()

