"""
Paragraph-aware sliding window chunker.
Splits ParsedDocument pages into overlapping text chunks for embedding.
"""

from dataclasses import dataclass
from typing import Optional

from app.services.pdf_parser import ParsedDocument

CHUNK_SIZE = 800    # target tokens per chunk (~4 chars each)
CHUNK_OVERLAP = 100  # overlap tokens between adjacent chunks


@dataclass
class Chunk:
    chunk_index: int
    text: str
    page_number: Optional[int]
    section_title: Optional[str]
    token_count: int


def _approx_tokens(text: str) -> int:
    return len(text) // 4


def chunk_document(parsed: ParsedDocument) -> list[Chunk]:
    chunks: list[Chunk] = []
    chunk_index = 0

    for page in parsed.pages:
        paragraphs = [p.strip() for p in page.text.split("\n\n") if p.strip()]
        current_parts: list[str] = []
        current_tokens = 0

        for para in paragraphs:
            para_tokens = _approx_tokens(para)

            if current_tokens + para_tokens > CHUNK_SIZE and current_parts:
                chunks.append(Chunk(
                    chunk_index=chunk_index,
                    text="\n\n".join(current_parts),
                    page_number=page.page_number,
                    section_title=page.section_type,
                    token_count=current_tokens,
                ))
                chunk_index += 1

                # Keep last paragraph(s) as overlap context
                overlap_parts: list[str] = []
                overlap_tokens = 0
                for part in reversed(current_parts):
                    t = _approx_tokens(part)
                    if overlap_tokens + t <= CHUNK_OVERLAP:
                        overlap_parts.insert(0, part)
                        overlap_tokens += t
                    else:
                        break
                current_parts = overlap_parts
                current_tokens = overlap_tokens

            current_parts.append(para)
            current_tokens += para_tokens

        if current_parts:
            chunks.append(Chunk(
                chunk_index=chunk_index,
                text="\n\n".join(current_parts),
                page_number=page.page_number,
                section_title=page.section_type,
                token_count=current_tokens,
            ))
            chunk_index += 1

    return chunks
