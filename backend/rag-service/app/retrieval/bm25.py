"""Retrieval – fast pure-Python BM25Okapi implementation for sparse lexical retrieval."""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Tuple

_TOKEN_PATTERN = re.compile(r"\b\w+\b")


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into lowercase word tokens."""
    return [token.lower() for token in _TOKEN_PATTERN.findall(text or "")]


class BM25Okapi:
    """
    BM25Okapi ranking model.
    Parameters:
      k1: Term frequency saturation parameter (default: 1.5).
      b: Document length normalization parameter (default: 0.75).
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.corpus_size = 0
        self.avgdl = 0.0
        self.doc_freqs: List[Dict[str, int]] = []
        self.idf: Dict[str, float] = {}
        self.doc_lens: List[int] = []

    def fit(self, corpus: List[str]) -> BM25Okapi:
        """Index a list of document strings."""
        self.corpus_size = len(corpus)
        if self.corpus_size == 0:
            return self

        total_length = 0
        df: Dict[str, int] = {}
        self.doc_freqs = []
        self.doc_lens = []

        for doc in corpus:
            tokens = tokenize(doc)
            length = len(tokens)
            self.doc_lens.append(length)
            total_length += length

            frequencies: Dict[str, int] = {}
            for token in tokens:
                frequencies[token] = frequencies.get(token, 0) + 1
            self.doc_freqs.append(frequencies)

            for token in frequencies:
                df[token] = df.get(token, 0) + 1

        self.avgdl = (total_length / self.corpus_size) if self.corpus_size > 0 else 0.0

        # Calculate BM25 IDF with smoothing
        self.idf = {}
        for token, freq in df.items():
            self.idf[token] = math.log(
                ((self.corpus_size - freq + 0.5) / (freq + 0.5)) + 1.0
            )

        return self

    def score(self, query: str) -> List[float]:
        """Compute BM25 scores for all indexed documents against the query."""
        if self.corpus_size == 0:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return [0.0] * self.corpus_size

        scores: List[float] = [0.0] * self.corpus_size
        avgdl = self.avgdl if self.avgdl > 0 else 1.0

        for q_token in query_tokens:
            token_idf = self.idf.get(q_token)
            if token_idf is None:
                continue

            for idx in range(self.corpus_size):
                tf = self.doc_freqs[idx].get(q_token, 0)
                if tf <= 0:
                    continue
                doc_len = self.doc_lens[idx]
                numerator = tf * (self.k1 + 1.0)
                denominator = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / avgdl))
                scores[idx] += token_idf * (numerator / denominator)

        return scores

    def rank(self, query: str, top_k: int = 20) -> List[Tuple[int, float]]:
        """Return list of (doc_index, score) sorted descending by score."""
        scores = self.score(query)
        scored_pairs = [(idx, s) for idx, s in enumerate(scores) if s > 0.0]
        scored_pairs.sort(key=lambda x: x[1], reverse=True)
        return scored_pairs[:top_k]
