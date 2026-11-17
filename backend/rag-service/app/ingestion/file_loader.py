"""Ingestion – safe file loading from shared storage volume."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class FileLoader:
    """Loads file bytes from the shared /data volume with safety checks."""

    def __init__(self) -> None:
        self._root = Path(settings.file_storage_root).resolve()
        self._max_bytes = settings.max_file_size_mb * 1024 * 1024

    def load(self, storage_path: str) -> bytes:
        """Read file content, enforcing path traversal and size limits."""
        resolved = self._safe_resolve(storage_path)
        size = resolved.stat().st_size
        if size > self._max_bytes:
            raise ValueError(
                f"File too large: {size} bytes (max {self._max_bytes})"
            )
        data = resolved.read_bytes()
        log.debug("Loaded %d bytes from %s", len(data), resolved)
        return data

    def _safe_resolve(self, storage_path: str) -> Path:
        """Resolve path and reject traversal attempts."""
        candidate = Path(storage_path)
        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            resolved = (self._root / storage_path).resolve()

        # Reject paths that escape the storage root
        try:
            resolved.relative_to(self._root)
        except ValueError:
            raise PermissionError(
                f"Path traversal detected: {storage_path!r} resolves outside storage root"
            )

        if not resolved.exists():
            raise FileNotFoundError(f"File not found at storage path: {resolved}")
        if not resolved.is_file():
            raise ValueError(f"Path is not a regular file: {resolved}")
        return resolved

    def validate_content_type(self, content_type: str) -> bool:
        return content_type in settings.allowed_content_types
