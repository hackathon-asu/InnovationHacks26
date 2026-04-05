from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AntonRX"
    environment: str = "development"

    # LLM provider: "gemini" | "ollama" | "groq" | "nvidia"
    llm_provider: str = "ollama"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash-lite"

    # Ollama (dev default) — run: ollama pull qwen3:4b && ollama pull nomic-embed-text
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:4b"
    ollama_embed_model: str = "nomic-embed-text"  # 768-dim, matches pgvector index

    # Groq (fast cloud fallback) — free tier: 6000 tokens/min on llama models
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    groq_max_tokens_per_min: int = 6000

    # NVIDIA Build (build.nvidia.com) — OpenAI-compatible, 1000 free credits
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "deepseek-ai/deepseek-v3.2"
    nvidia_embed_model: str = "nvidia/nv-embedqa-e5-v5"

    # Anthropic (console.anthropic.com)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250514"

    database_url: str = "postgresql+asyncpg://neondb_owner:password@localhost:5432/neondb"

    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 50

    embedding_dimensions: int = 768

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
