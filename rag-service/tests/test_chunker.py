"""Tests for the RecursiveCharacterTextSplitter."""

import pytest
from app.ingestion.chunker import RecursiveCharacterTextSplitter, TextChunk


def test_split_short_text_single_chunk():
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, overlap=50)
    text = "Hello world. This is a short text."
    chunks = splitter.split(text)
    assert len(chunks) == 1
    assert chunks[0].text == text.strip()


def test_split_long_text_multiple_chunks():
    splitter = RecursiveCharacterTextSplitter(chunk_size=100, overlap=20)
    text = ("A" * 50 + " ") * 20  # 1020 chars
    chunks = splitter.split(text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.text) <= 100 + 20  # size + some tolerance


def test_chunk_indices_are_sequential():
    splitter = RecursiveCharacterTextSplitter(chunk_size=200, overlap=30)
    text = " ".join([f"sentence number {i}." for i in range(50)])
    chunks = splitter.split(text)
    for i, chunk in enumerate(chunks):
        assert chunk.index == i


def test_empty_text_returns_empty():
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, overlap=50)
    chunks = splitter.split("")
    assert chunks == []


def test_split_respects_paragraph_boundaries():
    splitter = RecursiveCharacterTextSplitter(chunk_size=200, overlap=0)
    text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    chunks = splitter.split(text)
    # Each paragraph should stay intact as chunks are small enough
    joined = " ".join(c.text for c in chunks)
    assert "Paragraph one" in joined
    assert "Paragraph two" in joined
