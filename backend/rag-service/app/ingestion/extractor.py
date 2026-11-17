"""Ingestion – text extraction with Kreuzberg-first strategy."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger(__name__)

# Extraction version is bumped when the extraction logic changes so that
# idempotent re-ingestion can be triggered deterministically.
EXTRACTION_VERSION = "1"


@dataclass
class ExtractionResult:
    text: str
    page_count: Optional[int] = None
    extraction_version: str = EXTRACTION_VERSION
    confidence: float = 1.0


class TextExtractor:
    """
    Extracts plain text from supported file types.

    Strategy:
      1. Try Kreuzberg (PDF digital, Office docs, images via Tesseract OCR).
      2. Fall back to a simple byte-decode for plain text / CSV / Markdown.
    """

    def extract(self, content: bytes, content_type: str, file_name: str = "") -> ExtractionResult:
        # Attempt Kreuzberg extraction first
        result = self._try_kreuzberg(content, content_type, file_name)
        if result is not None:
            return result

        # Fallback: plain text decode
        return self._fallback_text(content, content_type)

    # ── Kreuzberg ──────────────────────────────────────────────────────────
    def _try_kreuzberg(
        self, content: bytes, content_type: str, file_name: str
    ) -> Optional[ExtractionResult]:
        try:
            import kreuzberg  # type: ignore[import]

            result = kreuzberg.extract_bytes(content, mime_type=content_type)
            text = result.content if hasattr(result, "content") else str(result)
            page_count = getattr(result, "page_count", None)
            log.debug(
                "Kreuzberg extracted %d chars from %s (pages=%s)",
                len(text),
                content_type,
                page_count,
            )
            return ExtractionResult(
                text=text,
                page_count=page_count,
                extraction_version=EXTRACTION_VERSION,
                confidence=0.95,
            )
        except ImportError:
            log.warning("kreuzberg not installed; falling back to plain text decode")
            return None
        except Exception as exc:  # noqa: BLE001
            log.warning("Kreuzberg extraction failed (%s): %s", content_type, exc)
            return None

    # ── Plain text fallback ────────────────────────────────────────────────
    def _fallback_text(self, content: bytes, content_type: str) -> ExtractionResult:
        plain_types = {
            "text/plain",
            "text/csv",
            "text/markdown",
            "text/html",
            "application/json",
        }
        if content_type in plain_types or content_type.startswith("text/"):
            for enc in ("utf-8", "latin-1", "cp1252"):
                try:
                    return ExtractionResult(
                        text=content.decode(enc),
                        extraction_version=EXTRACTION_VERSION,
                        confidence=0.9,
                    )
                except UnicodeDecodeError:
                    continue
        # Last resort: ignore errors
        return ExtractionResult(
            text=content.decode("utf-8", errors="ignore"),
            extraction_version=EXTRACTION_VERSION,
            confidence=0.3,
        )
