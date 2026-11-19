"""Tests for the TextExtractor across PDF, DOCX, XLSX, PPTX, text, and images."""

from __future__ import annotations

import io

import pytest

from app.ingestion.extractor import ExtractionError, TextExtractor


def test_extract_plain_text():
    extractor = TextExtractor()
    content = b"Hello world, this is plain text."
    result = extractor.extract(content, "text/plain", "test.txt")
    assert "Hello world" in result.text
    assert result.extraction_version == "2"


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


def test_extract_pdf():
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Quantum mechanics fundamentals PDF content")
    pdf_bytes = doc.tobytes()
    doc.close()

    result = TextExtractor().extract(pdf_bytes, "application/pdf", "lecture.pdf")
    assert "Quantum mechanics fundamentals" in result.text
    assert result.page_count == 1
    assert result.extractor == "pymupdf"


def test_extract_docx():
    from docx import Document

    doc = Document()
    doc.add_paragraph("Neural network backpropagation summary")
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Layer"
    table.rows[0].cells[1].text = "Activation"
    buf = io.BytesIO()
    doc.save(buf)

    result = TextExtractor().extract(
        buf.getvalue(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "notes.docx",
    )
    assert "Neural network backpropagation summary" in result.text
    assert "Layer | Activation" in result.text
    assert result.extractor == "python-docx"


def test_extract_xlsx():
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Grades"
    ws.append(["Student", "Score"])
    ws.append(["Ada", 99])
    buf = io.BytesIO()
    wb.save(buf)

    result = TextExtractor().extract(
        buf.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "grades.xlsx",
    )
    assert "[Sheet: Grades]" in result.text
    assert "Ada | 99" in result.text
    assert result.extractor == "openpyxl"


def test_extract_pptx():
    from pptx import Presentation

    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = "Distributed Consensus"
    slide.placeholders[1].text = "Raft and Paxos protocols"
    buf = io.BytesIO()
    prs.save(buf)

    result = TextExtractor().extract(
        buf.getvalue(),
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "slides.pptx",
    )
    assert "[Slide 1]" in result.text
    assert "Distributed Consensus" in result.text
    assert "Raft and Paxos protocols" in result.text
    assert result.extractor == "python-pptx"


def test_extract_image_ocr(monkeypatch):
    from PIL import Image
    import pytesseract

    img = Image.new("RGB", (100, 30), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    monkeypatch.setattr(pytesseract, "image_to_string", lambda _img: "Extracted OCR whiteboard note")

    result = TextExtractor().extract(buf.getvalue(), "image/png", "board.png")
    assert "Extracted OCR whiteboard note" in result.text
    assert result.extractor == "pytesseract"


def test_extract_unsupported_binary_raises_explicitly():
    extractor = TextExtractor()
    with pytest.raises(ExtractionError, match="Unsupported content type"):
        extractor.extract(b"\x89\x50\x4e\x47\x00\x01\x02", "application/octet-stream", "unknown.bin")


def test_extract_empty_content_raises():
    with pytest.raises(ExtractionError, match="empty"):
        TextExtractor().extract(b"", "text/plain", "empty.txt")
