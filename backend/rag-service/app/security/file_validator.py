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

    def validate(
        self,
        content_type: str,
        file_size_bytes: int,
        file_name: str = "",
        storage_path: str = "",
    ) -> bool:
        """
        Validate file metadata and path before ingestion.
        Raises ValueError with an explanatory message if validation fails.
        """
        if storage_path and not self.validate_storage_path(storage_path):
            raise ValueError(f"Unsafe or invalid storage path: {storage_path!r}")

        normalized_type = (content_type or "").split(";")[0].strip().lower()
        if not self.validate_content_type(normalized_type):
            raise ValueError(
                f"Unsupported content type '{content_type}'. Allowed types: {sorted(settings.allowed_content_types)}"
            )

        if not self.validate_file_size(file_size_bytes):
            max_mb = settings.max_file_size_mb
            raise ValueError(
                f"File size {file_size_bytes} bytes is invalid (must be between 1 byte and {max_mb} MB)"
            )

        if file_name and "\x00" in file_name:
            raise ValueError("File name contains prohibited null bytes")

        return True
