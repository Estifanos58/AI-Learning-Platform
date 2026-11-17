"""Agents – Citation agent: enriches responses with formatted citations."""

from __future__ import annotations

from typing import Any, Dict, List

from app.agents.base_agent import AgentContext, AgentResult, BaseAgent


class CitationAgent(BaseAgent):
    """
    Post-processing agent that enriches an existing response with
    structured citations from the retrieved chunks.
    """

    @property
    def name(self) -> str:
        return "citation"

    @property
    def description(self) -> str:
        return "Produces structured citation list from retrieved chunks."

    async def run(self, context: AgentContext) -> AgentResult:
        citations = self._build_structured_citations(context.chunks)
        lines = []
        for c in citations:
            file_short = c["file_id"][:8] if c.get("file_id") else "?"
            page_info = f", page {c['page_number']}" if c.get("page_number") else ""
            lines.append(f"[{c['index']}] File {file_short}{page_info}: {c['preview']}")

        return AgentResult(
            agent_name=self.name,
            content="\n".join(lines),
            citations=citations,
        )

    def _build_structured_citations(
        self, chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        seen = set()
        unique: List[Dict[str, Any]] = []
        idx = 1
        for chunk in chunks:
            payload = chunk.get("payload", {})
            key = (payload.get("file_id", ""), payload.get("page_number"))
            if key not in seen:
                seen.add(key)
                unique.append(
                    {
                        "index": idx,
                        "file_id": payload.get("file_id", ""),
                        "page_number": payload.get("page_number"),
                        "preview": payload.get("chunk_text", "")[:120] + "...",
                        "score": chunk.get("score", 0.0),
                    }
                )
                idx += 1
        return unique
