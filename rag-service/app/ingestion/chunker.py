"""Ingestion – recursive character text splitter."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

# Separator hierarchy (most semantic → least semantic)
_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]


@dataclass
class TextChunk:
    index: int
    text: str
    char_start: int
    char_end: int
    metadata: dict = field(default_factory=dict)


class RecursiveCharacterTextSplitter:
    """
    Splits text recursively by a hierarchy of separators.
    Produces chunks of roughly `chunk_size` characters with `overlap` overlap.
    """

    def __init__(
        self,
        chunk_size: int | None = None,
        overlap: int | None = None,
        separators: List[str] | None = None,
    ) -> None:
        self._size = chunk_size or settings.chunk_size
        self._overlap = overlap or settings.chunk_overlap
        self._separators = separators or _SEPARATORS

    def split(self, text: str) -> List[TextChunk]:
        raw_chunks = self._split_text(text, self._separators)
        chunks: List[TextChunk] = []
        offset = 0
        for idx, chunk_text in enumerate(raw_chunks):
            start = text.find(chunk_text, offset)
            if start == -1:
                start = offset
            end = start + len(chunk_text)
            chunks.append(
                TextChunk(
                    index=idx,
                    text=chunk_text.strip(),
                    char_start=start,
                    char_end=end,
                )
            )
            offset = max(start + 1, end - self._overlap)
        log.debug("Split text into %d chunks", len(chunks))
        return chunks

    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        if not text:
            return []
        sep = separators[0] if separators else ""
        remaining_seps = separators[1:]

        parts = re.split(re.escape(sep), text) if sep else list(text)

        good_splits: List[str] = []
        current = ""

        for part in parts:
            candidate = current + (sep if current else "") + part
            if len(candidate) <= self._size:
                current = candidate
            else:
                if current:
                    good_splits.append(current)
                if len(part) > self._size and remaining_seps:
                    good_splits.extend(self._split_text(part, remaining_seps))
                    current = ""
                else:
                    current = part

        if current:
            good_splits.append(current)

        return [s for s in good_splits if s.strip()]
