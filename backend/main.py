from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.db.session import init_db
from app.api.routes import ingest
from app.api.routes import query
from app.api.routes import fetch

settings = get_settings()
setup_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting AntonRX API", env=settings.environment)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    log.info("Upload directory ready", path=str(settings.upload_dir))
    await init_db()
    log.info("Database ready — pgvector extension enabled")
    yield
    log.info("Shutting down")


app = FastAPI(
    title="AntonRX API",
    description="Medical benefit drug policy ingestion and RAG query engine",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(fetch.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": "0.2.0"}
