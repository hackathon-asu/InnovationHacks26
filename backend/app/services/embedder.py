"""
Embedding service — Gemini text-embedding-004 or Ollama nomic-embed-text (768-dim).
Provider selected via settings.llm_provider ("gemini" | "ollama").
"""

import asyncio
import time
from typing import TYPE_CHECKING

import httpx
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from app.core.config import get_settings
from app.core.logging import get_logger

if TYPE_CHECKING:
    from app.services.chunker import Chunk

settings = get_settings()
log = get_logger(__name__)

genai.configure(api_key=settings.gemini_api_key)

GEMINI_EMBED_MODEL = "models/text-embedding-004"
BATCH_SIZE = 50


def _embed_batch_gemini(texts: list[str], task_type: str) -> list[list[float]]:
    results = []
    for t in texts:
        for attempt in range(5):
            try:
                results.append(
                    genai.embed_content(model=GEMINI_EMBED_MODEL, content=t, task_type=task_type)["embedding"]
                )
                break
            except ResourceExhausted:
                wait = 20 * (attempt + 1)
                log.warning("Embed rate limited, retrying", attempt=attempt + 1, wait=wait)
                time.sleep(wait)
        else:
            raise RuntimeError(f"Embedding failed after 5 attempts for text: {t[:50]}")
    return results


def _embed_batch_ollama(texts: list[str]) -> list[list[float]]:
    results = []
    for t in texts:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.ollama_embed_model, "prompt": t},
            timeout=30.0,
        )
        response.raise_for_status()
        results.append(response.json()["embedding"])
    return results


async def embed_chunks(chunks: "list[Chunk]") -> list[list[float]]:
    """Embed document chunks in batches of 50."""
    texts = [c.text for c in chunks]
    embeddings: list[list[float]] = []
    loop = asyncio.get_event_loop()

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        if settings.llm_provider == "ollama":
            batch_embeddings = await loop.run_in_executor(None, _embed_batch_ollama, batch)
        else:
            batch_embeddings = await loop.run_in_executor(None, _embed_batch_gemini, batch, "retrieval_document")
        embeddings.extend(batch_embeddings)
        log.debug("Embedded batch", provider=settings.llm_provider, start=i, size=len(batch))

    return embeddings


async def embed_query(question: str) -> list[float]:
    """Embed a single query string for vector search."""
    loop = asyncio.get_event_loop()
    if settings.llm_provider == "ollama":
        result = await loop.run_in_executor(None, _embed_batch_ollama, [question])
    else:
        result = await loop.run_in_executor(None, _embed_batch_gemini, [question], "retrieval_query")
    return result[0]
