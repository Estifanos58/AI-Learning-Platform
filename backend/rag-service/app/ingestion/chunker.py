"""Ingestion – recursive character text splitter with structure preservation, actual overlap, and metadata."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, List, Optional

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]


@dataclass
class TextChunk:
    index: int
    text: str
    char_start: int
    char_end: int
    metadata: dict = field(default_factory=dict)
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    sheet_name: Optional[str] = None
    section: Optional[str] = None
    token_count: int = 0


class RecursiveCharacterTextSplitter:
    """
    Splits text recursively by a hierarchy of separators with true overlap.
    Preserves structural boundaries and propagates document metadata.
    """

    def __init__(
        self,
        chunk_size: int | None = None,
        overlap: int | None = None,
        separators: List[str] | None = None,
    ) -> None:
        self._size = chunk_size or settings.chunk_size
        self._overlap = overlap if overlap is not None else settings.chunk_overlap
        if self._overlap >= self._size:
            self._overlap = max(0, self._size // 5)
        self._separators = separators or _SEPARATORS

    def estimate_tokens(self, text: str) -> int:
        """Token-aware token count estimation."""
        if not text:
            return 0
        words = text.split()
        if not words:
            return max(1, len(text) // 4)
        return max(1, int(len(words) * 1.33))

    def split(
        self,
        text: str,
        elements: Optional[List[Any]] = None,
    ) -> List[TextChunk]:
        if not text or not text.strip():
            return []

        raw_chunks = self._split_text_with_overlap(text, self._separators)
        chunks: List[TextChunk] = []
        offset = 0

        for idx, chunk_text in enumerate(raw_chunks):
            cleaned = chunk_text.strip()
            if not cleaned:
                continue

            start = text.find(chunk_text, offset)
            if start == -1:
                prefix = chunk_text[: min(40, len(chunk_text))]
                start = text.find(prefix, offset)
                if start == -1:
                    start = offset
            end = start + len(chunk_text)

            page_number: Optional[int] = None
            slide_number: Optional[int] = None
            sheet_name: Optional[str] = None
            section: Optional[str] = None

            if elements:
                for elem in elements:
                    e_start = getattr(elem, "char_start", 0)
                    e_end = getattr(elem, "char_end", len(text))
                    if max(start, e_start) < min(end, e_end) or (start >= e_start and end <= e_end):
                        if getattr(elem, "page_number", None) is not None and page_number is None:
                            page_number = elem.page_number
                        if getattr(elem, "slide_number", None) is not None and slide_number is None:
                            slide_number = elem.slide_number
                        if getattr(elem, "sheet_name", None) is not None and sheet_name is None:
                            sheet_name = elem.sheet_name
                        if getattr(elem, "section", None) is not None and section is None:
                            section = elem.section

            token_count = self.estimate_tokens(cleaned)
            meta = {
                "page_number": page_number,
                "slide_number": slide_number,
                "sheet_name": sheet_name,
                "section": section,
                "char_start": start,
                "char_end": end,
                "token_count": token_count,
            }

            chunks.append(
                TextChunk(
                    index=idx,
                    text=cleaned,
                    char_start=start,
                    char_end=end,
                    metadata=meta,
                    page_number=page_number,
                    slide_number=slide_number,
                    sheet_name=sheet_name,
                    section=section,
                    token_count=token_count,
                )
            )
            offset = max(0, start + 1)

        log.debug("Split text into %d chunks with overlap=%d", len(chunks), self._overlap)
        return chunks

    def _split_text_with_overlap(self, text: str, separators: List[str]) -> List[str]:
        if not text:
            return []

        atomic_splits = self._split_to_atomic(text, separators)
        if not atomic_splits:
            return []

        chunks: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        for unit in atomic_splits:
            unit_len = len(unit)
            if current_chunk and (current_len + unit_len > self._size):
                chunk_str = "".join(current_chunk).strip()
                if chunk_str:
                    chunks.append(chunk_str)

                if self._overlap > 0:
                    overlap_units: List[str] = []
                    overlap_len = 0
                    for u in reversed(current_chunk):
                        if overlap_len + len(u) <= self._overlap:
                            overlap_units.insert(0, u)
                            overlap_len += len(u)
                        else:
                            break

                    if not overlap_units and current_chunk:
                        last_unit = current_chunk[-1].strip()
                        words = last_unit.split()
                        suffix_words: List[str] = []
                        suffix_len = 0
                        for w in reversed(words):
                            w_len = len(w) + (1 if suffix_words else 0)
                            if suffix_len + w_len <= self._overlap or not suffix_words:
                                suffix_words.insert(0, w)
                                suffix_len += w_len
                                if suffix_len >= self._overlap:
                                    break
                            else:
                                break
                        if suffix_words:
                            overlap_suffix = " ".join(suffix_words) + " "
                            overlap_units = [overlap_suffix]
                            overlap_len = len(overlap_suffix)

                    if overlap_units == current_chunk:
                        overlap_units = current_chunk[1:]
                        overlap_len = sum(len(x) for x in overlap_units)

                    current_chunk = list(overlap_units)
                    current_len = overlap_len
                else:
                    current_chunk = []
                    current_len = 0

            current_chunk.append(unit)
            current_len += unit_len

        if current_chunk:
            chunk_str = "".join(current_chunk).strip()
            if chunk_str and (not chunks or chunks[-1] != chunk_str):
                chunks.append(chunk_str)

        return chunks

    def _split_to_atomic(self, text: str, separators: List[str]) -> List[str]:
        if not text:
            return []

        if not separators:
            return [text[i : i + self._size] for i in range(0, len(text), self._size)]

        sep = separators[0]
        remaining = separators[1:]

        if sep:
            parts = text.split(sep)
            splits: List[str] = []
            for i, p in enumerate(parts):
                part_with_sep = p + sep if i < len(parts) - 1 else p
                if not part_with_sep:
                    continue
                if len(part_with_sep) > self._size and remaining:
                    splits.extend(self._split_to_atomic(part_with_sep, remaining))
                else:
                    splits.append(part_with_sep)
            return splits
        else:
            return [text[i : i + self._size] for i in range(0, len(text), self._size)]
