# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Stage 1: Document parsing — Docling primary, Marker as OCR fallback.

Research findings:
  - Docling (IBM): 97.9% accuracy on complex table extraction, handles multi-column layouts,
    extracts embedded drug/HCPCS code tables natively, outputs structured Markdown/JSON.
  - Marker (Datalab): Full OCR pipeline for scanned PDFs, 90+ languages via Surya engine.
  - Strategy: Try Docling first. If page yield is poor (scanned), run Marker on those pages.

Sections detected per the standard medical policy structure:
  1. Policy Title / Number / Effective Date
  2. Description / Background
  3. Policy Statement (covered/not covered)
  4. Clinical Criteria / Medical Necessity
  5. Applicable Codes (HCPCS, CPT, ICD-10, J-codes)
  6. Documentation Requirements
  7. Revision History
"""

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

from bs4 import BeautifulSoup

from app.core.logging import get_logger

log = get_logger(__name__)

# Section header patterns for medical policies (semi-consistent across payers)
SECTION_PATTERNS = {
    "policy_statement":   re.compile(r"policy\s+statement|coverage\s+(policy|determination)", re.I),
    "clinical_criteria":  re.compile(r"(clinical\s+criteria|medical\s+necessity|coverage\s+criteria)", re.I),
    "applicable_codes":   re.compile(r"applicable\s+(codes?|code\s+table)|hcpcs|cpt\s+codes?", re.I),
    "step_therapy":       re.compile(r"step\s+therapy|step-through|fail-first", re.I),
    "prior_auth":         re.compile(r"prior\s+auth(orization)?|pre-?auth", re.I),
    "quantity_limits":    re.compile(r"quantity\s+limit|dose\s+limit|supply\s+limit", re.I),
    "documentation":      re.compile(r"documentation\s+(requirements?|needed)", re.I),
    "revision_history":   re.compile(r"revision\s+history|change\s+history|amendment", re.I),
    "background":         re.compile(r"background|description|overview|introduction", re.I),
}


@dataclass
class PageText:
    page_number: int
    text: str
    section_type: str | None = None
    was_ocr: bool = False


@dataclass
class ParsedDocument:
    file_hash: str
    page_count: int
    pages: list[PageText]
    raw_markdown: str = ""          # Docling's full Markdown output (preserves tables)
    metadata: dict = field(default_factory=dict)  # policy_number, effective_date if found in header

    @property
    def full_text(self) -> str:
        """Full text with page markers — used for Gemini extraction."""
        return self.raw_markdown or "\n\n".join(
            f"[Page {p.page_number}]\n{p.text}" for p in self.pages
        )

    @property
    def sections(self) -> dict[str, str]:
        """Return text grouped by detected section type."""
        grouped: dict[str, list[str]] = {}
        for page in self.pages:
            key = page.section_type or "general"
            grouped.setdefault(key, []).append(page.text)
        return {k: "\n\n".join(v) for k, v in grouped.items()}


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _detect_section(text: str) -> str | None:
    """Classify a text block into one of the standard medical policy sections."""
    for section_name, pattern in SECTION_PATTERNS.items():
        if pattern.search(text[:300]):   # check only the first 300 chars (header area)
            return section_name
    return None


def _clean_text(text: str) -> str:
    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip common header/footer noise
    text = re.sub(r"Page \d+ of \d+", "", text)
    text = re.sub(r"CONFIDENTIAL|FOR INTERNAL USE ONLY", "", text, flags=re.I)
    return text.strip()


def _parse_with_docling(file_path: Path) -> tuple[str, list[PageText]]:
    """
    Use Docling for primary parsing.
    Returns (full_markdown, list_of_PageText).
    Docling preserves table structure better than any other OSS tool (97.9% accuracy).
    """
    try:
        from docling.document_converter import DocumentConverter
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False           # We handle OCR fallback ourselves
        pipeline_options.do_table_structure = True # Critical for drug/code tables

        converter = DocumentConverter()
        result = converter.convert(str(file_path))
        doc = result.document

        full_markdown = doc.export_to_markdown()

        pages: list[PageText] = []
        for i, page in enumerate(doc.pages, start=1):
            # Docling gives us page-level text — collect and classify
            page_text = "\n\n".join(
                item.text for item in doc.texts
                if hasattr(item, 'prov') and any(
                    p.page_no == i for p in (item.prov or [])
                )
            )
            cleaned = _clean_text(page_text)
            pages.append(PageText(
                page_number=i,
                text=cleaned,
                section_type=_detect_section(cleaned),
            ))

        log.info("Docling parse complete", pages=len(pages), markdown_chars=len(full_markdown))
        return full_markdown, pages

    except Exception as e:
        log.warning("Docling failed, will fall back", error=str(e))
        return "", []


def _parse_with_marker(file_path: Path) -> tuple[str, list[PageText]]:
    """
    Marker fallback — best OCR pipeline, handles scanned PDFs via Surya engine.
    Used when Docling yields poor results (< MIN_CHARS total).
    """
    try:
        from marker.convert import convert_single_pdf
        from marker.models import load_all_models

        models = load_all_models()
        full_text, images, metadata = convert_single_pdf(str(file_path), models)

        cleaned = _clean_text(full_text)
        # Marker doesn't give per-page text cleanly — treat as single block, split on page markers
        page_blocks = re.split(r"\[Page \d+\]|\f", cleaned)
        pages = [
            PageText(
                page_number=i + 1,
                text=_clean_text(block),
                section_type=_detect_section(block),
                was_ocr=True,
            )
            for i, block in enumerate(page_blocks) if block.strip()
        ]

        log.info("Marker parse complete (OCR)", pages=len(pages))
        return cleaned, pages

    except Exception as e:
        log.warning("Marker also failed", error=str(e))
        # Final fallback: basic pypdf
        return _parse_with_pypdf(file_path)


def _parse_with_pypdf(file_path: Path) -> tuple[str, list[PageText]]:
    """Last-resort fallback using pypdf (no table structure, no OCR)."""
    import pypdf
    pages = []
    full_parts = []
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for i, page in enumerate(reader.pages, start=1):
            text = _clean_text(page.extract_text() or "")
            pages.append(PageText(page_number=i, text=text, section_type=_detect_section(text)))
            full_parts.append(text)
    return "\n\n".join(full_parts), pages


MIN_TOTAL_CHARS = 500   # if Docling yields less than this, assume scanned → use Marker

_HTML_DISCARD_TAGS = {"script", "style", "nav", "header", "footer", "noscript", "meta", "link"}


def parse_html(file_path: Path) -> ParsedDocument:
    """
    Parse an HTML snapshot saved by a payer retriever.
    Uses BeautifulSoup to strip tags and extract meaningful text, then applies
    the same section detection and cleaning as the PDF path.
    Returns a ParsedDocument with identical shape so the rest of the pipeline
    is unaware of the source format.
    """
    raw_bytes = file_path.read_bytes()
    file_hash = hashlib.sha256(raw_bytes).hexdigest()

    soup = BeautifulSoup(raw_bytes, "lxml")
    for tag in soup.find_all(_HTML_DISCARD_TAGS):
        tag.decompose()

    plain = soup.get_text(separator="\n")
    cleaned = _clean_text(plain)

    raw_blocks = re.split(r"\n{2,}", cleaned)
    pages: list[PageText] = []
    for i, block in enumerate(raw_blocks, start=1):
        stripped = block.strip()
        if stripped:
            pages.append(PageText(
                page_number=i,
                text=stripped,
                section_type=_detect_section(stripped),
            ))

    metadata: dict = {}
    head_text = cleaned[:2000]
    date_match = re.search(r"effective\s+(?:date[:\s]+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", head_text, re.I)
    if date_match:
        metadata["effective_date"] = date_match.group(1)
    pol_match = re.search(r"policy\s+(?:number|#|no\.?)[:\s]+([A-Z0-9\-]+)", head_text, re.I)
    if pol_match:
        metadata["policy_number"] = pol_match.group(1)

    log.info("HTML parse complete", paragraphs=len(pages), chars=len(cleaned), hash=file_hash[:12])
    return ParsedDocument(
        file_hash=file_hash,
        page_count=len(pages),
        pages=pages,
        raw_markdown=cleaned,
        metadata=metadata,
    )


def parse_document(file_path: Path, content_type: str = "pdf") -> ParsedDocument:
    """
    Unified entry point called by the ingestion pipeline.
    Routes to parse_html() for HTML snapshots, parse_pdf() for everything else.
    """
    suffix = file_path.suffix.lower()
    if content_type == "html" or suffix in (".html", ".htm"):
        return parse_html(file_path)
    return parse_pdf(file_path)


def _parse_text_file(file_path: Path) -> tuple[str, list[PageText]]:
    """Parse plain text or HTML files directly — no PDF tooling needed."""
    raw = file_path.read_text(encoding="utf-8", errors="replace")

    # Strip HTML tags if present
    if "<html" in raw[:500].lower() or "<body" in raw[:500].lower() or "<div" in raw[:1000].lower():
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(raw, "lxml")
            text = soup.get_text(" ", strip=True)
        except Exception:
            text = re.sub(r"<[^>]+>", " ", raw)
    else:
        text = raw

    cleaned = _clean_text(text)

    # Split into ~3000-char synthetic "pages" for downstream compatibility
    chunk_size = 3000
    blocks = [cleaned[i:i + chunk_size] for i in range(0, len(cleaned), chunk_size)]
    pages = [
        PageText(
            page_number=i + 1,
            text=block.strip(),
            section_type=_detect_section(block),
        )
        for i, block in enumerate(blocks) if block.strip()
    ]

    log.info("Text/HTML parse complete", chars=len(cleaned), pages=len(pages))
    return cleaned, pages


def parse_pdf(file_path: Path) -> ParsedDocument:
    """
    Main entry point. Handles PDF, HTML, TXT, DOCX files.
    PDF: Docling → Marker → pypdf fallback chain.
    Text/HTML: direct text extraction.
    """
    file_hash = compute_sha256(file_path)
    suffix = file_path.suffix.lower()
    log.info("Parsing document", path=str(file_path), hash=file_hash[:12], type=suffix)

    # Non-PDF files: parse as text/HTML directly
    if suffix in (".txt", ".html", ".htm", ".md", ".csv", ".xml"):
        full_markdown, pages = _parse_text_file(file_path)
    else:
        # PDF path: Docling → Marker → pypdf
        full_markdown, pages = _parse_with_docling(file_path)

        total_chars = sum(len(p.text) for p in pages)
        if total_chars < MIN_TOTAL_CHARS:
            log.info("Low text yield from Docling, switching to Marker OCR", chars=total_chars)
            full_markdown, pages = _parse_with_marker(file_path)

    # Attempt to extract top-level metadata from first page
    metadata = {}
    if pages:
        first_text = pages[0].text
        date_match = re.search(r"effective\s+(?:date[:\s]+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", first_text, re.I)
        if date_match:
            metadata["effective_date"] = date_match.group(1)
        policy_num_match = re.search(r"policy\s+(?:number|#|no\.?)[:\s]+([A-Z0-9\-]+)", first_text, re.I)
        if policy_num_match:
            metadata["policy_number"] = policy_num_match.group(1)

    page_count = len(pages)
    log.info("Parse complete", pages=page_count, sections=len(set(p.section_type for p in pages if p.section_type)))

    return ParsedDocument(
        file_hash=file_hash,
        page_count=page_count,
        pages=pages,
        raw_markdown=full_markdown,
        metadata=metadata,
    )
