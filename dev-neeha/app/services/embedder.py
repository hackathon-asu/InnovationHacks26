"""
Embedding service — Gemini text-embedding-004, batched 50/request.
"""

import asyncio
from typing import TYPE_CHECKING

import google.generativeai as genai

from app.core.config import get_settings
from app.core.logging import get_logger

if TYPE_CHECKING:
    from app.services.chunker import Chunk

settings = get_settings()
log = get_logger(__name__)

genai.configure(api_key=settings.gemini_api_key)

EMBED_MODEL = "models/text-embedding-004"
BATCH_SIZE = 50


def _embed_batch(texts: list[str], task_type: str) -> list[list[float]]:
    return [
        genai.embed_content(model=EMBED_MODEL, content=t, task_type=task_type)["embedding"]
        for t in texts
    ]


async def embed_chunks(chunks: "list[Chunk]") -> list[list[float]]:
    """Embed document chunks in batches of 50."""
    texts = [c.text for c in chunks]
    embeddings: list[list[float]] = []
    loop = asyncio.get_event_loop()

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        batch_embeddings = await loop.run_in_executor(
            None, _embed_batch, batch, "retrieval_document"
        )
        embeddings.extend(batch_embeddings)
        log.debug("Embedded batch", start=i, size=len(batch))

    return embeddings


async def embed_query(question: str) -> list[float]:
    """Embed a single query string for vector search."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, _embed_batch, [question], "retrieval_query"
    )
    return result[0]
