from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AntonRX"
    environment: str = "development"

    # LLM provider: "gemini" or "ollama"
    # Set LLM_PROVIDER=gemini in prod .env once Gemini credits are available
    llm_provider: str = "ollama"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Ollama (dev default) — run: ollama pull qwen2.5:7b && ollama pull nomic-embed-text
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    ollama_embed_model: str = "nomic-embed-text"  # 768-dim, matches pgvector index

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/antonrx"

    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 50

    embedding_dimensions: int = 768

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
