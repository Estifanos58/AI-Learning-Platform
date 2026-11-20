"""Agents – Citation agent: enriches responses with formatted citations."""

from __future__ import annotations

import hashlib
from typing import Any, Dict, List

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent


class CitationAgent(BaseAgent):
    """
    Post-processing agent that enriches an existing response with
    structured citations from the retrieved chunks with fine-grained metadata.
    """

    @property
    def name(self) -> str:
        return "citation"

    @property
    def description(self) -> str:
        return "Produces structured citation list from retrieved chunks."

    async def run(
        self,
        context: AgentContext,
        on_chunk: Any = None,
    ) -> AgentResult:
        citations = self._build_structured_citations(context.chunks)
        lines = []
        for c in citations:
            loc_parts = []
            if c.get("page_number"):
                loc_parts.append(f"page {c['page_number']}")
            if c.get("slide_number"):
                loc_parts.append(f"slide {c['slide_number']}")
            if c.get("sheet_name"):
                loc_parts.append(f"sheet {c['sheet_name']}")
            if c.get("section"):
                loc_parts.append(f"section '{c['section']}'")
            loc_info = f" ({', '.join(loc_parts)})" if loc_parts else ""
            doc_name = c.get("document_name") or (f"File {c['file_id'][:8]}" if c.get("file_id") else "Document")
            lines.append(f"[{c['index']}] {doc_name}{loc_info}: {c['preview']}")

        return AgentResult(
            agent_name=self.name,
            content="\n".join(lines),
            citations=citations,
        )

    def _build_structured_citations(
        self, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        seen_keys = set()
        unique: List[Dict[str, Any]] = []
        idx = 1
        for chunk in chunks:
            payload = chunk.get("payload", {})
            text = (payload.get("chunk_text") or "").strip()
            chunk_id = payload.get("chunk_id") or chunk.get("id") or ""
            text_hash = hashlib.sha256(text.encode()).hexdigest()[:16] if text else ""
            key = chunk_id or (payload.get("file_id", ""), text_hash)

            if key not in seen_keys:
                seen_keys.add(key)
                preview_text = text[:140] + ("..." if len(text) > 140 else "")
                unique.append(
                    {
                        "index": idx,
                        "file_id": payload.get("file_id", ""),
                        "document_name": payload.get("document_name") or payload.get("file_name", ""),
                        "page_number": payload.get("page_number"),
                        "slide_number": payload.get("slide_number"),
                        "sheet_name": payload.get("sheet_name"),
                        "section": payload.get("section"),
                        "char_start": payload.get("char_start"),
                        "char_end": payload.get("char_end"),
                        "chunk_id": chunk_id,
                        "preview": preview_text,
                        "chunk_text_preview": preview_text,
                        "chunk_text": text,
                        "score": chunk.get("score", 0.0),
                    }
                )
                idx += 1
        return unique
