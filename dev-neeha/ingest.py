"""
POST /api/v1/ingest/upload     — accept PDF, kick off background pipeline
GET  /api/v1/ingest/status/{id} — poll pipeline status
GET  /api/v1/ingest/policies    — list all indexed policies
GET  /api/v1/ingest/policies/{id} — full policy detail with drugs
"""

import hashlib
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.policy import Policy, DrugCoverage
from app.schemas.policy import PolicyListItem, PolicyOut, PolicyUploadResponse, PipelineStatus, PipelineStage
from app.services.ingestion_pipeline import run_ingestion_pipeline

router = APIRouter(prefix="/ingest", tags=["ingestion"])
settings = get_settings()
log = get_logger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_BYTES = settings.max_upload_size_mb * 1024 * 1024

# Maps DB status values → pipeline stage breakdown for the frontend
STATUS_STAGES = {
    "pending":           (0,  []),
    "parsing":           (15, ["parse"]),
    "extracting":        (30, ["parse", "extract"]),
    "saving_structured": (50, ["parse", "extract", "postgres"]),
    "chunking":          (60, ["parse", "extract", "postgres", "chunk"]),
    "embedding":         (75, ["parse", "extract", "postgres", "chunk", "embed"]),
    "indexing":          (90, ["parse", "extract", "postgres", "chunk", "embed", "index"]),
    "indexed":           (100, ["parse", "extract", "postgres", "chunk", "embed", "index", "rag"]),
    "failed":            (0,  []),
}

ALL_STAGES = ["parse", "extract", "postgres", "chunk", "embed", "index", "rag"]
STAGE_LABELS = {
    "parse":    "Parse & OCR",
    "extract":  "Gemini extraction",
    "postgres": "Save to PostgreSQL",
    "chunk":    "Chunk document",
    "embed":    "Embed chunks",
    "index":    "Index in pgvector",
    "rag":      "Ready for RAG",
}


@router.post("/upload", response_model=PolicyUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_policy(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Accept a PDF policy document, save it to disk, create a Policy record,
    and kick off the ingestion pipeline as a background task.
    """
    # Validate file type
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Only {ALLOWED_EXTENSIONS} files are accepted.",
        )

    # Read into memory to check size (streaming alternative for large files below)
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_size_mb}MB limit.",
        )

    # Save to upload directory with a UUID filename to avoid collisions
    policy_id = uuid.uuid4()
    dest_path = settings.upload_dir / f"{policy_id}{suffix}"
    with open(dest_path, "wb") as f_out:
        f_out.write(contents)

    log.info("File saved", policy_id=str(policy_id), filename=file.filename, bytes=len(contents))

    # Create pending policy record
    policy = Policy(
        id=policy_id,
        filename=file.filename,
        payer_name="",              # filled by pipeline
        original_file_path=str(dest_path),
        file_hash="",               # filled by pipeline
        status="pending",
    )
    db.add(policy)
    await db.commit()

    # Launch pipeline in background — returns immediately to caller
    background_tasks.add_task(run_ingestion_pipeline, policy_id, dest_path)

    return PolicyUploadResponse(
        policy_id=policy_id,
        filename=file.filename,
        status="pending",
        message="Upload accepted. Pipeline running in background.",
    )


@router.get("/status/{policy_id}", response_model=PipelineStatus)
async def get_pipeline_status(policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Poll this endpoint to get live pipeline progress."""
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    progress, done_stages = STATUS_STAGES.get(policy.status, (0, []))

    stages = []
    for s in ALL_STAGES:
        if s in done_stages:
            st = "done"
        elif done_stages and s == ALL_STAGES[len(done_stages)] if len(done_stages) < len(ALL_STAGES) else None:
            st = "running"
        else:
            # Find if this is the next one after done_stages
            done_count = len(done_stages)
            s_idx = ALL_STAGES.index(s)
            if s_idx == done_count and policy.status not in ("indexed", "failed"):
                st = "running"
            elif policy.status == "failed":
                st = "error" if s_idx == len(done_stages) else ("done" if s in done_stages else "pending")
            else:
                st = "pending"

        stages.append(PipelineStage(
            stage=STAGE_LABELS[s],
            status=st,
            message=policy.error_message if st == "error" else None,
        ))

    return PipelineStatus(
        policy_id=policy_id,
        overall_status=policy.status,
        progress_pct=progress,
        stages=stages,
        error=policy.error_message,
    )


@router.get("/policies", response_model=list[PolicyListItem])
async def list_policies(db: AsyncSession = Depends(get_db)):
    """Return all policies with a drug count."""
    result = await db.execute(
        select(
            Policy,
            func.count(DrugCoverage.id).label("drug_count"),
        )
        .outerjoin(DrugCoverage, DrugCoverage.policy_id == Policy.id)
        .group_by(Policy.id)
        .order_by(Policy.created_at.desc())
    )
    rows = result.all()

    return [
        PolicyListItem(
            id=policy.id,
            filename=policy.filename,
            payer_name=policy.payer_name,
            effective_date=policy.effective_date,
            status=policy.status,
            drug_count=drug_count,
            created_at=policy.created_at,
        )
        for policy, drug_count in rows
    ]


@router.get("/policies/{policy_id}", response_model=PolicyOut)
async def get_policy(policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Full policy detail including all drugs and PA criteria."""
    result = await db.execute(
        select(Policy)
        .where(Policy.id == policy_id)
        .options(
            selectinload(Policy.drug_coverages).selectinload(DrugCoverage.clinical_criteria)
        )
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy
