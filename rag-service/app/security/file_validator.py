"""Security – file path and content type validator."""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()


class FileValidator:
    """Validates file paths and content types before ingestion."""

    def validate_storage_path(self, storage_path: str) -> bool:
        """Return True if path is safe and within the storage root."""
        try:
            root = Path(settings.file_storage_root).resolve()
            candidate = Path(storage_path)
            if candidate.is_absolute():
                resolved = candidate.resolve()
            else:
                resolved = (root / storage_path).resolve()
            resolved.relative_to(root)  # raises ValueError on traversal
            return True
        except (ValueError, Exception):
            log.warning("Unsafe storage path rejected: %s", storage_path)
            return False

    def validate_content_type(self, content_type: str) -> bool:
        return content_type in settings.allowed_content_types

    def validate_file_size(self, size_bytes: int) -> bool:
        max_bytes = settings.max_file_size_mb * 1024 * 1024
        return 0 < size_bytes <= max_bytes
