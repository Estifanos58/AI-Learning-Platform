from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class StreamSink(ABC):
    @abstractmethod
    async def publish(self, event: Dict[str, Any]) -> None:
        raise NotImplementedError
