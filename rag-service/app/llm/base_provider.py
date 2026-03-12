"""LLM – abstract base for all providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, List, Optional


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class LLMRequest:
    messages: List[LLMMessage]
    model: Optional[str] = None
    max_tokens: int = 2048
    temperature: float = 0.2
    stream: bool = True
    user_api_key: Optional[str] = None


@dataclass
class LLMChunk:
    delta: str
    done: bool = False
    finish_reason: Optional[str] = None


@dataclass
class LLMUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_estimate: float = 0.0


class BaseLLMProvider(ABC):
    """All LLM providers implement this interface."""

    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @property
    @abstractmethod
    def default_model(self) -> str: ...

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if API key / endpoint is configured."""
        ...

    @abstractmethod
    async def stream(self, request: LLMRequest) -> AsyncIterator[LLMChunk]:
        """Yield token chunks; last chunk has done=True."""
        ...

    @abstractmethod
    async def get_usage(self) -> LLMUsage:
        """Return token usage for the last completed request."""
        ...
