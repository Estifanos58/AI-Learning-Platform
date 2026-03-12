"""Tests for the TextExtractor."""

import pytest
from app.ingestion.extractor import TextExtractor


def test_extract_plain_text():
    extractor = TextExtractor()
    content = b"Hello world, this is plain text."
    result = extractor.extract(content, "text/plain", "test.txt")
    assert "Hello world" in result.text
    assert result.extraction_version is not None


def test_extract_markdown():
    extractor = TextExtractor()
    content = b"# Heading\n\nSome **markdown** text."
    result = extractor.extract(content, "text/markdown", "test.md")
    assert "Heading" in result.text


def test_extract_csv():
    extractor = TextExtractor()
    content = b"name,age\nAlice,30\nBob,25"
    result = extractor.extract(content, "text/csv", "data.csv")
    assert "Alice" in result.text


def test_extract_unknown_type_falls_back():
    extractor = TextExtractor()
    content = b"some binary-ish content with text"
    result = extractor.extract(content, "application/octet-stream", "unknown.bin")
    # Should not raise, may have low confidence
    assert isinstance(result.text, str)
    assert result.confidence < 1.0
