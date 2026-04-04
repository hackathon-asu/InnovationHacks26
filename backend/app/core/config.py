from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AntonRX"
    environment: str = "development"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/antonrx"

    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 50

    embedding_dimensions: int = 768

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
