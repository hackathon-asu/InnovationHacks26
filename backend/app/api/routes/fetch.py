"""
POST /api/v1/fetch/policies   — trigger automated policy retrieval
GET  /api/v1/fetch/payers     — list available payer adapters
GET  /api/v1/fetch/stored     — list locally cached policy files

The fetch endpoint accepts a drug name + list of payers, runs the
payer-specific retrievers, stores any new files, creates Policy DB
records, and kicks off the ingestion pipeline — all automatically.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.services.policy_fetcher import RETRIEVER_REGISTRY, run_auto_fetch
from app.services.policy_store import PolicyStore

router = APIRouter(prefix="/fetch", tags=["auto-retrieval"])
log = get_logger(__name__)

# Deduplicated display names for supported payers
SUPPORTED_PAYERS = [
    {
        "key": "UnitedHealthcare",
        "display": "UnitedHealthcare",
        "description": "Individual PDFs per drug, updated monthly",
        "format": "pdf",
    },
    {
        "key": "Cigna",
        "display": "Cigna",
        "description": "Drug & Biologic Coverage Policies, A-Z index",
        "format": "pdf",
    },
    {
        "key": "Priority Health",
        "display": "Priority Health",
        "description": "Single consolidated Medical Drug List PDF",
        "format": "pdf",
    },
]


class FetchRequest(BaseModel):
    drug_name: str = Field(..., min_length=1, description="Drug brand or generic name")
    payers: list[str] = Field(
        ...,
        min_length=1,
        description="List of payer names to retrieve from",
        examples=[["UnitedHealthcare", "Cigna"]],
    )
    provider: str = Field(
        "gemini",
        description="LLM provider for ingestion pipeline (gemini|ollama|groq|nvidia|anthropic)",
    )
    auto_ingest: bool = Field(
        False,
        description="If true, automatically start ingestion pipeline for new files",
    )


class FetchResponse(BaseModel):
    drug_name: str
    payers_requested: list[str]
    results: list[dict]
    policy_ids: list[str]
    new_files: int
    errors: int
    status: str


@router.post("/policies", response_model=FetchResponse)
async def fetch_policies(body: FetchRequest):
    """
    Automatically retrieve the latest medical benefit policy documents
    for a given drug from one or more payers.

    - Runs payer-specific retrievers in parallel
    - Deduplicates by file hash (skips unchanged files)
    - Saves new files to policies/{payer}/{drug}/
    - Creates Policy DB records and launches the ingestion pipeline
    - Returns immediately with results and policy_ids for status polling
    """
    log.info(
        "Auto-fetch request received",
        drug=body.drug_name,
        payers=body.payers,
        provider=body.provider,
    )

    # Validate payers against registry
    unknown = [
        p for p in body.payers
        if not any(
            k in p.lower() or p.lower() in k
            for k in RETRIEVER_REGISTRY.keys()
        )
    ]
    if unknown:
        log.warning("Unknown payer(s) requested", payers=unknown)
        # Don't fail hard — just warn; retriever will return empty list

    try:
        result = await run_auto_fetch(
            drug_name=body.drug_name,
            payer_names=body.payers,
            provider=body.provider,
            skip_pipeline=not body.auto_ingest,
        )
    except Exception as exc:
        log.error("Auto-fetch failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Fetch failed: {exc}")

    return FetchResponse(**result)


class IngestRequest(BaseModel):
    local_path: str = Field(..., description="Path to the fetched file on disk")
    payer: str = Field(..., description="Payer name")
    filename: str = Field(..., description="Original filename")
    provider: str = Field("gemini", description="LLM provider")
    source_url: str | None = None
    file_hash: str | None = None
    effective_date: str | None = None


@router.post("/ingest")
async def ingest_fetched_file(body: IngestRequest):
    """Manually trigger ingestion for a previously fetched file."""
    import asyncio
    import uuid
    from pathlib import Path
    from app.db.session import AsyncSessionLocal
    from app.models.policy import Policy
    from app.services.ingestion_pipeline import run_ingestion_pipeline

    file_path = Path(body.local_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {body.local_path}")

    policy_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        policy = Policy(
            id=policy_id,
            filename=body.filename,
            payer_name=body.payer,
            original_file_path=str(file_path),
            source_url=body.source_url or "",
            file_hash=body.file_hash or "",
            effective_date=body.effective_date,
            status="pending",
        )
        db.add(policy)
        await db.commit()

    asyncio.create_task(run_ingestion_pipeline(policy_id, file_path, body.provider))

    return {"policy_id": str(policy_id), "status": "pipeline_started"}


@router.get("/payers")
async def list_payers():
    """Return the list of payers with available retrieval adapters."""
    return {"payers": SUPPORTED_PAYERS}


@router.get("/stored")
async def list_stored_policies(
    payer: str = Query(None, description="Filter by payer name"),
    drug: str = Query(None, description="Filter by drug name"),
):
    """
    List all locally cached policy files.
    Useful for checking what has already been retrieved before triggering
    a new fetch.
    """
    store = PolicyStore()
    items = store.list_stored(payer=payer, drug=drug)
    return {"count": len(items), "items": items}
