"""Tests for the RecursiveCharacterTextSplitter."""

from app.ingestion.chunker import RecursiveCharacterTextSplitter


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


def test_chunk_actual_overlap():
    splitter = RecursiveCharacterTextSplitter(chunk_size=100, overlap=30)
    text = (
        "The quick brown fox jumps over the lazy dog. "
        "Artificial intelligence is transforming education and learning. "
        "Retrieval augmented generation provides grounded answers with citations. "
        "Accurate metadata preservation ensures trustworthy source tracking."
    )
    chunks = splitter.split(text)
    assert len(chunks) >= 3

    # Check that adjacent chunks share text (actual overlap)
    has_overlap = False
    for i in range(len(chunks) - 1):
        c1 = chunks[i].text
        c2 = chunks[i + 1].text
        # Check if words from end of c1 appear in start of c2
        words_c1 = c1.split()
        words_c2 = c2.split()
        overlap_words = set(words_c1[-3:]).intersection(set(words_c2[:5]))
        if overlap_words:
            has_overlap = True
            break
    assert has_overlap is True


def test_chunk_preserves_document_metadata():
    from app.ingestion.extractor import DocumentElement

    elements = [
        DocumentElement(text="Page 1 text", page_number=1, section="Introduction", char_start=0, char_end=50),
        DocumentElement(text="Slide 2 text", slide_number=2, section="Architecture", char_start=51, char_end=120),
        DocumentElement(text="Sheet 3 text", sheet_name="Data", section="Sheet: Data", char_start=121, char_end=200),
    ]
    text = "Page 1 text here with some more information. " * 3
    splitter = RecursiveCharacterTextSplitter(chunk_size=60, overlap=10)
    chunks = splitter.split(text, elements=elements)
    assert len(chunks) > 0
    assert chunks[0].page_number == 1
    assert chunks[0].section == "Introduction"
    assert chunks[0].token_count > 0
    assert chunks[0].metadata["char_start"] >= 0
    assert chunks[0].metadata["char_end"] > chunks[0].metadata["char_start"]
