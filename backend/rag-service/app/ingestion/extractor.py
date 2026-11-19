"""Ingestion – structured document extraction with real format parsers and OCR."""

from __future__ import annotations

import io
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger(__name__)

# Extraction version is bumped when extraction logic changes so that
# idempotent re-ingestion can be triggered deterministically.
EXTRACTION_VERSION = "2"

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)


class ExtractionError(RuntimeError):
    """Raised when document extraction fails or produces invalid/empty output."""


@dataclass
class ExtractionResult:
    text: str
    page_count: Optional[int] = None
    extraction_version: str = EXTRACTION_VERSION
    confidence: float = 1.0
    extractor: str = "unknown"


class TextExtractor:
    """
    Extracts validated plain text from supported document formats:
      - PDF (PyMuPDF text extraction with Tesseract OCR fallback for scanned pages)
      - DOCX (python-docx paragraphs and tables)
      - XLSX (openpyxl worksheets and rows)
      - PPTX (python-pptx slides, tables, and speaker notes)
      - Images (PNG, JPEG, WEBP, TIFF via Pillow + Tesseract OCR)
      - Plain text, Markdown, CSV, JSON, HTML (charset detection & decoding)

    Unsupported binary formats fail explicitly with ExtractionError rather than
    returning corrupted UTF-8 decoded bytes.
    """

    PLAIN_TYPES = {
        "text/plain",
        "text/csv",
        "text/markdown",
        "text/html",
        "application/json",
    }
    IMAGE_TYPES = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/tiff",
    }
    DOCX_TYPES = {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    XLSX_TYPES = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    PPTX_TYPES = {
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }

    def extract(self, content: bytes, content_type: str, file_name: str = "") -> ExtractionResult:
        if not content:
            raise ExtractionError("Cannot extract text from empty file content")

        normalized_type = (content_type or "").split(";")[0].strip().lower()
        ext = os.path.splitext(file_name or "")[1].lower()

        if normalized_type == "application/pdf" or ext == ".pdf":
            result = self._extract_pdf(content)
        elif normalized_type in self.DOCX_TYPES or ext == ".docx":
            result = self._extract_docx(content)
        elif normalized_type in self.XLSX_TYPES or ext == ".xlsx":
            result = self._extract_xlsx(content)
        elif normalized_type in self.PPTX_TYPES or ext == ".pptx":
            result = self._extract_pptx(content)
        elif normalized_type in self.IMAGE_TYPES or ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
            result = self._extract_image_ocr(content)
        elif normalized_type in self.PLAIN_TYPES or normalized_type.startswith("text/") or ext in {".txt", ".md", ".csv", ".json", ".html", ".htm"}:
            result = self._extract_plain_text(content, normalized_type)
        else:
            raise ExtractionError(
                f"Unsupported content type '{content_type}' (file='{file_name}') for text extraction"
            )

        return self._validate_result(result, content_type=normalized_type, file_name=file_name)

    def _validate_result(
        self, result: ExtractionResult, content_type: str, file_name: str
    ) -> ExtractionResult:
        cleaned = (result.text or "").replace("\x00", "").strip()
        if not cleaned:
            raise ExtractionError(
                f"Document extraction produced empty text for content_type='{content_type}' file='{file_name}'"
            )
        # Reject extraction outputs that look predominantly like non-printable binary noise
        printable_chars = sum(1 for ch in cleaned if ch.isprintable() or ch in "\n\r\t")
        if len(cleaned) > 0 and (printable_chars / len(cleaned)) < 0.7:
            raise ExtractionError(
                f"Extracted content contains excessive non-printable characters for file='{file_name}'"
            )
        result.text = cleaned
        return result

    def _extract_pdf(self, content: bytes) -> ExtractionResult:
        try:
            import fitz  # type: ignore[import]
        except ImportError as exc:
            raise ExtractionError("PyMuPDF (pymupdf) is required for PDF extraction") from exc

        try:
            doc = fitz.open(stream=content, filetype="pdf")
        except Exception as exc:
            raise ExtractionError(f"Invalid or corrupted PDF document: {exc}") from exc

        try:
            page_count = len(doc)
            if page_count == 0:
                raise ExtractionError("PDF document contains zero pages")

            pages_text: list[str] = []
            used_ocr = False
            for idx, page in enumerate(doc):
                text = (page.get_text("text") or "").strip()
                if not text:
                    # Scanned page fallback via Tesseract OCR
                    ocr_text = self._ocr_pdf_page(page, idx + 1)
                    if ocr_text:
                        used_ocr = True
                        text = ocr_text
                if text:
                    pages_text.append(f"[Page {idx + 1}]\n{text}")

            combined = "\n\n".join(pages_text)
            return ExtractionResult(
                text=combined,
                page_count=page_count,
                extraction_version=EXTRACTION_VERSION,
                confidence=0.85 if used_ocr else 0.98,
                extractor="pymupdf+ocr" if used_ocr else "pymupdf",
            )
        finally:
            doc.close()

    def _ocr_pdf_page(self, page: object, page_num: int) -> str:
        try:
            from PIL import Image
            import pytesseract  # type: ignore[import]

            pix = page.get_pixmap(dpi=200)  # type: ignore[attr-defined]
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            return (pytesseract.image_to_string(img) or "").strip()
        except Exception as exc:
            log.warning("OCR fallback failed on PDF page %d: %s", page_num, exc)
            return ""

    def _extract_docx(self, content: bytes) -> ExtractionResult:
        try:
            from docx import Document  # type: ignore[import]
        except ImportError as exc:
            raise ExtractionError("python-docx is required for DOCX extraction") from exc

        try:
            doc = Document(io.BytesIO(content))
        except Exception as exc:
            raise ExtractionError(f"Invalid or corrupted DOCX document: {exc}") from exc

        parts: list[str] = []
        for para in doc.paragraphs:
            text = (para.text or "").strip()
            if text:
                parts.append(text)

        for table in doc.tables:
            for row in table.rows:
                cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                if any(cells):
                    parts.append(" | ".join(cells))

        return ExtractionResult(
            text="\n\n".join(parts),
            page_count=None,
            extraction_version=EXTRACTION_VERSION,
            confidence=0.98,
            extractor="python-docx",
        )

    def _extract_xlsx(self, content: bytes) -> ExtractionResult:
        try:
            import openpyxl  # type: ignore[import]
        except ImportError as exc:
            raise ExtractionError("openpyxl is required for XLSX extraction") from exc

        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        except Exception as exc:
            raise ExtractionError(f"Invalid or corrupted XLSX workbook: {exc}") from exc

        try:
            sheets_text: list[str] = []
            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                rows_text: list[str] = []
                for row in ws.iter_rows(values_only=True):
                    values = ["" if v is None else str(v).strip() for v in row]
                    if any(values):
                        rows_text.append(" | ".join(values))
                if rows_text:
                    sheets_text.append(f"[Sheet: {sheet_name}]\n" + "\n".join(rows_text))

            return ExtractionResult(
                text="\n\n".join(sheets_text),
                page_count=len(wb.sheetnames),
                extraction_version=EXTRACTION_VERSION,
                confidence=0.98,
                extractor="openpyxl",
            )
        finally:
            wb.close()

    def _extract_pptx(self, content: bytes) -> ExtractionResult:
        try:
            from pptx import Presentation  # type: ignore[import]
        except ImportError as exc:
            raise ExtractionError("python-pptx is required for PPTX extraction") from exc

        try:
            prs = Presentation(io.BytesIO(content))
        except Exception as exc:
            raise ExtractionError(f"Invalid or corrupted PPTX presentation: {exc}") from exc

        slides_text: list[str] = []
        for idx, slide in enumerate(prs.slides, start=1):
            slide_parts: list[str] = []
            for shape in slide.shapes:
                if getattr(shape, "has_text_frame", False) and shape.text_frame is not None:
                    text = shape.text_frame.text.strip()
                    if text:
                        slide_parts.append(text)
                if getattr(shape, "has_table", False) and shape.table is not None:
                    for row in shape.table.rows:
                        cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                        if any(cells):
                            slide_parts.append(" | ".join(cells))
            if getattr(slide, "has_notes_slide", False) and slide.notes_slide and slide.notes_slide.notes_text_frame:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    slide_parts.append(f"Notes: {notes}")
            if slide_parts:
                slides_text.append(f"[Slide {idx}]\n" + "\n".join(slide_parts))

        return ExtractionResult(
            text="\n\n".join(slides_text),
            page_count=len(prs.slides),
            extraction_version=EXTRACTION_VERSION,
            confidence=0.98,
            extractor="python-pptx",
        )

    def _extract_image_ocr(self, content: bytes) -> ExtractionResult:
        try:
            from PIL import Image
            import pytesseract  # type: ignore[import]
        except ImportError as exc:
            raise ExtractionError("Pillow and pytesseract are required for image OCR") from exc

        try:
            img = Image.open(io.BytesIO(content))
            img.load()
            text = (pytesseract.image_to_string(img) or "").strip()
        except Exception as exc:
            raise ExtractionError(f"Image OCR extraction failed: {exc}") from exc

        return ExtractionResult(
            text=text,
            page_count=1,
            extraction_version=EXTRACTION_VERSION,
            confidence=0.8,
            extractor="pytesseract",
        )

    def _extract_plain_text(self, content: bytes, content_type: str) -> ExtractionResult:
        decoded: Optional[str] = None
        for encoding in ("utf-8-sig", "utf-8"):
            try:
                decoded = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if decoded is None:
            try:
                import chardet  # type: ignore[import]

                detected = chardet.detect(content)
                enc = detected.get("encoding")
                if enc:
                    decoded = content.decode(enc)
            except Exception:
                decoded = None

        if decoded is None:
            for encoding in ("latin-1", "cp1252"):
                try:
                    decoded = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

        if decoded is None:
            raise ExtractionError(f"Failed to decode text content for '{content_type}'")

        if content_type == "text/html":
            decoded = _HTML_SCRIPT_STYLE_RE.sub(" ", decoded)
            decoded = _HTML_TAG_RE.sub(" ", decoded)

        return ExtractionResult(
            text=decoded,
            page_count=None,
            extraction_version=EXTRACTION_VERSION,
            confidence=0.95,
            extractor="text",
        )
