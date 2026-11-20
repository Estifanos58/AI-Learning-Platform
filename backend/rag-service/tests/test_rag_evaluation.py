"""Tests for the RAG evaluation suite (Recall@K, Precision@K, MRR, nDCG, faithfulness, relevance, citation accuracy)."""

import pytest

from app.retrieval.evaluator import (
    answer_relevance_score,
    citation_accuracy_score,
    evaluate_rag_triplet,
    faithfulness_score,
    mean_reciprocal_rank,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)


def test_recall_and_precision_at_k():
    retrieved = ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"]
    relevant = {"doc-2", "doc-5", "doc-9"}

    # Top 3: ["doc-1", "doc-2", "doc-3"] contains doc-2 -> 1 out of 3 relevant
    assert recall_at_k(retrieved, relevant, k=3) == pytest.approx(1 / 3)
    # Precision at 3: 1 hit out of 3 retrieved
    assert precision_at_k(retrieved, relevant, k=3) == pytest.approx(1 / 3)

    # Top 5: ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"] contains doc-2, doc-5 -> 2 out of 3
    assert recall_at_k(retrieved, relevant, k=5) == pytest.approx(2 / 3)
    # Precision at 5: 2 hits out of 5
    assert precision_at_k(retrieved, relevant, k=5) == pytest.approx(2 / 5)


def test_mean_reciprocal_rank():
    # First hit is doc-2 at position 2 -> MRR = 1/2
    assert mean_reciprocal_rank(["doc-1", "doc-2", "doc-3"], {"doc-2", "doc-4"}) == 0.5

    # First hit is doc-1 at position 1 -> MRR = 1.0
    assert mean_reciprocal_rank(["doc-1", "doc-2"], {"doc-1"}) == 1.0

    # No hits -> MRR = 0.0
    assert mean_reciprocal_rank(["doc-1", "doc-2"], {"doc-99"}) == 0.0


def test_ndcg_at_k():
    retrieved = ["d1", "d2", "d3"]
    # Perfect ranking: highest relevance first
    perfect_relevance = {"d1": 3.0, "d2": 2.0, "d3": 1.0}
    assert ndcg_at_k(retrieved, perfect_relevance, k=3) == pytest.approx(1.0)

    # Inverted ranking
    inverted_relevance = {"d1": 1.0, "d2": 2.0, "d3": 3.0}
    assert ndcg_at_k(retrieved, inverted_relevance, k=3) < 1.0
    assert ndcg_at_k(retrieved, inverted_relevance, k=3) > 0.0


def test_faithfulness_score():
    context = [
        "Raft is a consensus algorithm designed as an alternative to Multi-Paxos.",
        "It achieves consensus through leader election, log replication, and safety.",
    ]
    # Grounded answer: all key terms present in context
    grounded_answer = "Raft is a consensus algorithm that achieves consensus through leader election."
    assert faithfulness_score(grounded_answer, context) > 0.8

    # Hallucinated answer: terms not present in context
    hallucinated_answer = "Quantum computing uses superconductors and qubits to factor prime numbers."
    assert faithfulness_score(hallucinated_answer, context) < 0.2


def test_answer_relevance_score():
    question = "How does the Raft leader election work?"
    relevant_answer = "The Raft leader election algorithm uses election timeouts and majority voting."
    irrelevant_answer = "Cooking pasta requires boiling water and olive oil."

    rel_score = answer_relevance_score(question, relevant_answer)
    irrel_score = answer_relevance_score(question, irrelevant_answer)
    assert rel_score > irrel_score
    assert rel_score > 0.5


def test_citation_accuracy_score():
    citations = [
        {"index": 1, "chunk_text": "Photosynthesis is the process by which green plants produce food."},
        {"index": 2, "chunk_text": "Mitochondria are the powerhouses of the cell."},
    ]
    context = [{"payload": c} for c in citations]

    # Valid citation: [1] cited for photosynthesis
    valid_answer = "Plants convert sunlight into energy via photosynthesis [1]."
    assert citation_accuracy_score(valid_answer, citations, context) >= 0.8

    # Invalid citation: [99] does not exist in citations list
    invalid_answer = "Plants convert sunlight into energy via photosynthesis [99]."
    assert citation_accuracy_score(invalid_answer, citations, context) <= 0.5


def test_evaluate_rag_triplet():
    chunks = [
        {"id": "c1", "chunk_text": "Transformers rely on the self-attention mechanism."},
        {"id": "c2", "chunk_text": "BERT is a bidirectional encoder transformer model."},
        {"id": "c3", "chunk_text": "GPT is an autoregressive decoder transformer model."},
    ]
    report = evaluate_rag_triplet(
        question="What mechanism do transformers rely on?",
        answer="Transformers rely on the self-attention mechanism [1].",
        retrieved_chunks=chunks,
        ground_truth_relevant_ids={"c1"},
        citations=[{"index": 1, "chunk_text": "Transformers rely on the self-attention mechanism."}],
        k=3,
    )

    assert report.recall_at_k == 1.0
    assert report.precision_at_k == pytest.approx(1 / 3, abs=1e-3)
    assert report.mrr == 1.0
    assert report.faithfulness > 0.8
    assert report.answer_relevance > 0.5
    assert report.citation_accuracy >= 0.8
