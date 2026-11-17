"""Agents – abstract base agent."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.llm.base_provider import LLMMessage
from app.llm.provider_executor import ProviderExecutor


@dataclass
class AgentContext:
    """Shared context passed to every agent during a pipeline run."""

    request_id: str
    user_id: str
    question: str
    chunks: List[Dict[str, Any]]  # retrieved & reranked context chunks
    model_id: Optional[str] = None
    model_name: Optional[str] = None
    provider_name: Optional[str] = None
    provider_model_name: Optional[str] = None
    api_key: Optional[str] = None
    endpoint_id: Optional[str] = None
    account_id: Optional[str] = None
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

    async def _execute_llm(
        self,
        context: AgentContext,
        messages: List[LLMMessage],
        max_tokens: int,
        temperature: float,
    ) -> str:
        if not context.provider_name or not context.provider_model_name:
            raise RuntimeError("Missing provider routing details in agent context")
        if not context.api_key:
            raise RuntimeError("Missing provider API key in agent context")
        if not context.endpoint_id or not context.account_id:
            raise RuntimeError("Missing endpoint/account identifiers in agent context")

        executor = ProviderExecutor()
        result = await executor.execute(
            provider_name=context.provider_name,
            provider_model_name=context.provider_model_name,
            api_key=context.api_key,
            messages=messages,
            endpoint_id=context.endpoint_id,
            account_id=context.account_id,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return result.content
