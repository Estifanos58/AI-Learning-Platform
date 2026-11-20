"""RAG evaluation module: metrics for retrieval quality, faithfulness, relevance, and citation accuracy."""

from __future__ import annotations

from dataclasses import dataclass, field
import math
import re
from typing import Any, Dict, List, Optional, Sequence, Set


@dataclass
class RAGEvaluationReport:
    recall_at_k: float = 0.0
    precision_at_k: float = 0.0
    mrr: float = 0.0
    ndcg_at_k: float = 0.0
    faithfulness: float = 0.0
    answer_relevance: float = 0.0
    citation_accuracy: float = 0.0
    k: int = 5
    details: Dict[str, Any] = field(default_factory=dict)


def recall_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int = 5) -> float:
    """Computes the fraction of relevant documents present in the top-K retrieved documents."""
    if not relevant_ids:
        return 1.0
    top_k = retrieved_ids[:max(1, k)]
    hits = sum(1 for doc_id in top_k if doc_id in relevant_ids)
    return hits / len(relevant_ids)


def precision_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int = 5) -> float:
    """Computes the fraction of top-K retrieved documents that are relevant."""
    if not retrieved_ids or k <= 0:
        return 0.0
    top_k = retrieved_ids[:k]
    hits = sum(1 for doc_id in top_k if doc_id in relevant_ids)
    return hits / len(top_k)


def mean_reciprocal_rank(retrieved_ids: Sequence[str], relevant_ids: Set[str]) -> float:
    """Computes Reciprocal Rank (1 / rank) of the first relevant document in retrieved list."""
    if not relevant_ids:
        return 1.0
    for rank, doc_id in enumerate(retrieved_ids, 1):
        if doc_id in relevant_ids:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(
    retrieved_ids: Sequence[str],
    relevance_scores: Dict[str, float],
    k: int = 5,
) -> float:
    """
    Computes Normalized Discounted Cumulative Gain at K (nDCG@K).
    Formula: DCG@K / IDCG@K, where DCG@K = sum((2^rel - 1) / log2(rank + 1)).
    """
    if not relevance_scores or not retrieved_ids or k <= 0:
        return 0.0

    top_k = retrieved_ids[:k]
    dcg = 0.0
    for rank, doc_id in enumerate(top_k, 1):
        rel = relevance_scores.get(doc_id, 0.0)
        dcg += (math.pow(2, rel) - 1.0) / math.log2(rank + 1)

    # Ideal DCG: sorted in descending order of true relevance
    ideal_scores = sorted(relevance_scores.values(), reverse=True)[:k]
    idcg = 0.0
    for rank, rel in enumerate(ideal_scores, 1):
        idcg += (math.pow(2, rel) - 1.0) / math.log2(rank + 1)

    if idcg <= 0.0:
        return 0.0
    return min(1.0, max(0.0, dcg / idcg))


def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"\w+", text.lower()) if len(w) > 2]


def faithfulness_score(answer: str, context_chunks: Sequence[str]) -> float:
    """
    Estimates the degree of factual grounding of the generated answer against context chunks.
    Extracts informative keywords/n-grams from the answer and calculates the proportion
    corroborated in the reference chunks.
    """
    if not answer.strip():
        return 0.0
    if not context_chunks:
        return 0.0

    combined_context = " ".join(context_chunks).lower()
    answer_tokens = _tokenize(answer)
    if not answer_tokens:
        return 1.0

    # Stopwords filter
    stopwords = {
        "the", "and", "that", "this", "with", "from", "for", "are", "was",
        "were", "have", "has", "had", "they", "them", "which", "what",
        "their", "there", "then", "been", "also", "into", "more", "such",
    }
    content_words = [w for w in answer_tokens if w not in stopwords]
    if not content_words:
        return 1.0

    grounded_count = sum(1 for w in content_words if w in combined_context)
    return min(1.0, grounded_count / len(content_words))


def answer_relevance_score(question: str, answer: str) -> float:
    """
    Estimates the topical and semantic alignment between the user's question and the generated answer.
    """
    if not question.strip() or not answer.strip():
        return 0.0

    q_tokens = set(_tokenize(question))
    a_tokens = set(_tokenize(answer))
    if not q_tokens:
        return 1.0

    # Overlap of question intent in answer
    overlap = len(q_tokens.intersection(a_tokens))
    query_coverage = overlap / len(q_tokens)

    # Penalize empty or trivial non-answers
    length_penalty = 1.0 if len(answer.split()) >= 4 else 0.5
    return min(1.0, query_coverage * length_penalty)


def citation_accuracy_score(
    answer: str,
    citations: Sequence[Dict[str, Any]],
    context_chunks: Sequence[Dict[str, Any]],
) -> float:
    """
    Verifies that:
      1. Every in-text reference [N] corresponds to a valid citation index.
      2. The cited chunk text actually exists and aligns with the sentence where it is cited.
    """
    matches = re.findall(r"\[(\d+)\]", answer or "")
    if not matches:
        # If there are no citations cited in answer
        return 1.0 if not citations else 0.5

    cited_indices = [int(m) for m in matches if m.isdigit()]
    available_citation_indices = {
        c.get("index") for c in citations if c.get("index") is not None
    }

    # Verify indices point to valid citations
    valid_index_count = sum(1 for idx in cited_indices if idx in available_citation_indices)
    index_validity_ratio = valid_index_count / len(cited_indices)

    # Check grounded content alignment for cited chunks
    content_alignment_count = 0
    citation_by_index = {c.get("index"): c for c in citations if c.get("index") is not None}

    sentences = re.split(r"[.!?\n]+", answer)
    for idx in set(cited_indices):
        citation = citation_by_index.get(idx)
        if not citation:
            continue
        chunk_text = (citation.get("chunk_text") or citation.get("preview") or "").lower()
        chunk_tokens = set(_tokenize(chunk_text))
        if not chunk_tokens:
            content_alignment_count += 1
            continue

        # Find sentence containing [idx]
        ref_tag = f"[{idx}]"
        matching_sentences = [s for s in sentences if ref_tag in s]
        if not matching_sentences:
            matching_sentences = sentences

        sent_tokens = set(_tokenize(" ".join(matching_sentences)))
        if chunk_tokens.intersection(sent_tokens):
            content_alignment_count += 1

    unique_cited = set(cited_indices)
    alignment_ratio = content_alignment_count / len(unique_cited) if unique_cited else 1.0

    return min(1.0, (index_validity_ratio * 0.5) + (alignment_ratio * 0.5))


def evaluate_rag_triplet(
    question: str,
    answer: str,
    retrieved_chunks: Sequence[Dict[str, Any]],
    ground_truth_relevant_ids: Set[str],
    relevance_scores: Optional[Dict[str, float]] = None,
    citations: Optional[Sequence[Dict[str, Any]]] = None,
    k: int = 5,
) -> RAGEvaluationReport:
    """
    Runs full end-to-end evaluation for a single (question, context, answer) triplet.
    """
    retrieved_ids = [
        str(c.get("payload", {}).get("chunk_id") or c.get("id") or c.get("payload", {}).get("file_id", ""))
        for c in retrieved_chunks
    ]
    raw_texts = [
        str(c.get("payload", {}).get("chunk_text") or c.get("chunk_text") or "")
        for c in retrieved_chunks
    ]

    scores = relevance_scores or {doc_id: 1.0 for doc_id in ground_truth_relevant_ids}

    rec = recall_at_k(retrieved_ids, ground_truth_relevant_ids, k=k)
    prec = precision_at_k(retrieved_ids, ground_truth_relevant_ids, k=k)
    mrr = mean_reciprocal_rank(retrieved_ids, ground_truth_relevant_ids)
    ndcg = ndcg_at_k(retrieved_ids, scores, k=k)
    faith = faithfulness_score(answer, raw_texts)
    relev = answer_relevance_score(question, answer)
    cit_acc = citation_accuracy_score(answer, citations or [], retrieved_chunks)

    return RAGEvaluationReport(
        recall_at_k=round(rec, 4),
        precision_at_k=round(prec, 4),
        mrr=round(mrr, 4),
        ndcg_at_k=round(ndcg, 4),
        faithfulness=round(faith, 4),
        answer_relevance=round(relev, 4),
        citation_accuracy=round(cit_acc, 4),
        k=k,
        details={
            "retrieved_count": len(retrieved_chunks),
            "relevant_count": len(ground_truth_relevant_ids),
        },
    )
