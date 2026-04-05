"""
Embedding service — supports Gemini, Ollama, NVIDIA, and Groq (via Ollama fallback).
All produce 768-dim vectors to match the pgvector HNSW index.
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


def _embed_batch_nvidia(texts: list[str], input_type: str = "passage") -> list[list[float]]:
    """NVIDIA NIM embedding API — requires input_type param."""
    results = []
    for t in texts:
        for attempt in range(3):
            try:
                response = httpx.post(
                    f"{settings.nvidia_base_url}/embeddings",
                    headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
                    json={
                        "model": settings.nvidia_embed_model,
                        "input": [t],
                        "input_type": input_type,
                        "encoding_format": "float",
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                embedding = response.json()["data"][0]["embedding"]
                # Truncate to 768 dims (nv-embedqa-e5-v5 returns 1024)
                results.append(embedding[:settings.embedding_dimensions])
                break
            except (httpx.HTTPStatusError, httpx.ReadTimeout) as e:
                if attempt < 2:
                    wait = 5 * (attempt + 1)
                    log.warning("NVIDIA embed retry", attempt=attempt + 1, wait=wait, error=str(e))
                    time.sleep(wait)
                else:
                    raise
    return results


async def embed_chunks(chunks: "list[Chunk]", provider: str | None = None) -> list[list[float]]:
    """Embed document chunks in batches of 50."""
    texts = [c.text for c in chunks]
    embeddings: list[list[float]] = []
    loop = asyncio.get_event_loop()
    selected_provider = provider or settings.llm_provider

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        if selected_provider == "nvidia" and settings.nvidia_api_key:
            batch_embeddings = await loop.run_in_executor(None, _embed_batch_nvidia, batch, "passage")
        elif selected_provider in ("ollama", "groq", "anthropic"):
            batch_embeddings = await loop.run_in_executor(None, _embed_batch_ollama, batch)
        else:
            batch_embeddings = await loop.run_in_executor(None, _embed_batch_gemini, batch, "retrieval_document")
        embeddings.extend(batch_embeddings)
        log.debug("Embedded batch", provider=selected_provider, start=i, size=len(batch))

    return embeddings


async def embed_query(question: str) -> list[float]:
    """Embed a single query string for vector search."""
    loop = asyncio.get_event_loop()
    if settings.llm_provider in ("ollama", "groq"):
        result = await loop.run_in_executor(None, _embed_batch_ollama, [question])
    elif settings.llm_provider == "nvidia" and settings.nvidia_api_key:
        result = await loop.run_in_executor(None, _embed_batch_nvidia, [question], "query")
    else:
        result = await loop.run_in_executor(None, _embed_batch_gemini, [question], "retrieval_query")
    return result[0]
