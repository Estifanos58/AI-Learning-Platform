"""Agents – abstract base agent."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AgentContext:
    """Shared context passed to every agent during a pipeline run."""

    request_id: str
    user_id: str
    question: str
    chunks: List[Dict[str, Any]]  # retrieved & reranked context chunks
    model_id: Optional[str] = None
    user_api_key: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    agent_name: str
    content: str
    citations: List[Dict[str, Any]] = field(default_factory=list)
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """Contract for all RAG agents."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    def description(self) -> str:
        return ""

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Execute the agent and return a structured result."""
        ...

    # ── Shared helpers ────────────────────────────────────────────────────────

    def _build_context_text(self, chunks: List[Dict[str, Any]]) -> str:
        parts: List[str] = []
        for i, chunk in enumerate(chunks, 1):
            payload = chunk.get("payload", {})
            text = payload.get("chunk_text", "")
            file_id = payload.get("file_id", "")
            page = payload.get("page_number")
            ref = f"[{i}] (file:{file_id[:8]}"
            if page is not None:
                ref += f", p.{page}"
            ref += ")"
            parts.append(f"{ref}\n{text}")
        return "\n\n".join(parts)

    def _extract_citations(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        citations = []
        for i, chunk in enumerate(chunks, 1):
            payload = chunk.get("payload", {})
            citations.append(
                {
                    "index": i,
                    "file_id": payload.get("file_id", ""),
                    "page_number": payload.get("page_number"),
                    "chunk_text_preview": (payload.get("chunk_text", "")[:120] + "..."),
                    "score": chunk.get("score", 0.0),
                }
            )
        return citations
