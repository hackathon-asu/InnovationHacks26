# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
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

GEMINI_EMBED_MODEL = "models/text-embedding-005"
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
        # Truncate to 8000 chars (~2000 tokens) to stay within nomic-embed-text context
        truncated = t[:8000] if len(t) > 8000 else t
        response = httpx.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.ollama_embed_model, "prompt": truncated},
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
    """Embed document chunks in batches of 50. Skips failed chunks with zero vectors."""
    texts = [c.text for c in chunks]
    embeddings: list[list[float]] = []
    loop = asyncio.get_event_loop()
    selected_provider = provider or settings.llm_provider
    failed_count = 0
    zero_vector = [0.0] * settings.embedding_dimensions

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i: i + BATCH_SIZE]
        try:
            if settings.nvidia_api_key:
                batch_embeddings = await loop.run_in_executor(None, _embed_batch_nvidia, batch, "passage")
            else:
                batch_embeddings = await loop.run_in_executor(None, _embed_batch_ollama, batch)
        except Exception as e:
            log.warning("NVIDIA embedding failed, falling back to Ollama", error=str(e))
            try:
                batch_embeddings = await loop.run_in_executor(None, _embed_batch_ollama, batch)
            except Exception as e2:
                # Graceful degradation: embed each chunk individually, skip failures
                log.warning("Batch embed failed, trying individual chunks", error=str(e2), batch_start=i)
                batch_embeddings = []
                for j, text in enumerate(batch):
                    try:
                        single = await loop.run_in_executor(None, _embed_batch_ollama, [text])
                        batch_embeddings.append(single[0])
                    except Exception as e3:
                        log.warning("Chunk embed failed, using zero vector",
                                    chunk_index=i + j, chars=len(text), error=str(e3))
                        batch_embeddings.append(zero_vector)
                        failed_count += 1
        embeddings.extend(batch_embeddings)
        log.debug("Embedded batch", start=i, size=len(batch))

    if failed_count:
        log.warning("Some chunks failed embedding", failed=failed_count, total=len(texts))

    return embeddings


async def embed_query(question: str) -> list[float]:
    """Embed a single query string for vector search."""
    loop = asyncio.get_event_loop()
    try:
        if settings.nvidia_api_key:
            result = await loop.run_in_executor(None, _embed_batch_nvidia, [question], "query")
        else:
            result = await loop.run_in_executor(None, _embed_batch_ollama, [question])
    except Exception as e:
        log.warning("NVIDIA query embedding failed, falling back to Ollama", error=str(e))
        result = await loop.run_in_executor(None, _embed_batch_ollama, [question])
    return result[0]
