"""Orchestration – response aggregator: merges agent outputs."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.agents.base_agent import AgentResult

log = logging.getLogger(__name__)


class ResponseAggregator:
    """
    Merges outputs from multiple agents into a single streamable response.

    Strategy:
      • If only one agent ran, return its content directly.
      • If multiple agents ran, combine with section headers.
      • Citations are deduplicated by (file_id, page_number).
    """

    def aggregate(
        self, results: List[AgentResult], output_format: str = "markdown"
    ) -> Dict[str, Any]:
        if not results:
            return {"content": "", "citations": []}

        content_parts = []
        all_citations: List[Dict[str, Any]] = []
        seen_citations: set = set()

        for result in results:
            if len(results) > 1:
                content_parts.append(f"### {result.agent_name.capitalize()}\n{result.content}")
            else:
                content_parts.append(result.content)

            for c in result.citations:
                key = (c.get("file_id", ""), c.get("page_number"))
                if key not in seen_citations:
                    seen_citations.add(key)
                    all_citations.append(c)

        # Re-index citations
        for i, c in enumerate(all_citations, 1):
            c["index"] = i

        return {
            "content": "\n\n".join(content_parts),
            "citations": all_citations,
        }
