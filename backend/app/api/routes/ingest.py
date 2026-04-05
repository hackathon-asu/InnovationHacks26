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

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.policy import Policy, DrugCoverage, AuditLog
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
    "parsing":           (8,  []),
    "nlp_extracting":    (20, ["parse"]),
    "gemini_extracting": (35, ["parse", "nlp"]),
    "rxnorm":            (48, ["parse", "nlp", "llm"]),
    "saving_structured": (58, ["parse", "nlp", "llm", "postgres"]),
    "chunking":          (68, ["parse", "nlp", "llm", "postgres", "chunk"]),
    "embedding":         (80, ["parse", "nlp", "llm", "postgres", "chunk", "embed"]),
    "indexing":          (92, ["parse", "nlp", "llm", "postgres", "chunk", "embed", "index"]),
    "indexed":           (100, ["parse", "nlp", "llm", "postgres", "chunk", "embed", "index", "rag"]),
    "failed":            (0,  []),
}

ALL_STAGES = ["parse", "nlp", "llm", "postgres", "chunk", "embed", "index", "rag"]
STAGE_LABELS = {
    "parse":    "Parse & OCR",
    "nlp":      "NLP extraction",
    "llm":      "LLM extraction",
    "postgres": "Save to PostgreSQL",
    "chunk":    "Chunk document",
    "embed":    "Embed chunks",
    "index":    "Index in pgvector",
    "rag":      "Ready for RAG",
}

FAILED_STAGE_HINTS = {
    "parse": ("docling", "marker", "pypdf", "parse", "ocr", "pdf"),
    "extract": ("json", "structured extraction", "ollama", "gemini", "groq", "nvidia", "anthropic", "section"),
    "postgres": ("postgres", "sql", "database", "duplicate key", "constraint"),
    "chunk": ("chunk",),
    "embed": ("embed", "embedding"),
    "index": ("index", "pgvector", "vector"),
    "rag": ("rag",),
}


# In-memory extraction progress tracker (reset on restart — fine for live status)
from app.services.gemini_extractor import extraction_progress


def _infer_failed_stage(policy: Policy) -> str:
    if policy.error_message:
        lowered = policy.error_message.lower()
        for stage, hints in FAILED_STAGE_HINTS.items():
            if any(hint in lowered for hint in hints):
                return stage

    return {
        "parsing": "parse",
        "nlp_extracting": "extract",
        "gemini_extracting": "extract",
        "rxnorm": "extract",
        "saving_structured": "postgres",
        "chunking": "chunk",
        "embedding": "embed",
        "indexing": "index",
    }.get(policy.status, "extract")


@router.post("/upload", response_model=PolicyUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_policy(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    provider: str = Query(None, description="LLM provider override: gemini or ollama"),
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

    selected_provider = provider if provider in ("gemini", "ollama", "groq", "nvidia", "anthropic") else settings.llm_provider

    # Launch pipeline in background — returns immediately to caller
    background_tasks.add_task(run_ingestion_pipeline, policy_id, dest_path, selected_provider)

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
    failed_stage = _infer_failed_stage(policy) if policy.status == "failed" else None

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
                st = "error" if s == failed_stage else ("done" if s in done_stages else "pending")
            else:
                st = "pending"

        # Show actual model name + section progress for the LLM stage
        label = STAGE_LABELS[s]
        msg = policy.error_message if st == "error" else None
        if s == "llm" and policy.llm_provider:
            provider_labels = {
                "gemini": "Gemini",
                "ollama": "Ollama (Qwen3)",
                "groq": "Groq (Llama)",
                "nvidia": "NVIDIA (DeepSeek)",
                "anthropic": "Claude",
            }
            model_name = provider_labels.get(policy.llm_provider, policy.llm_provider)
            # Add section progress if available
            prog = extraction_progress.get(str(policy_id))
            if prog and st == "running":
                done_s = prog.get("sections_done", 0)
                total_s = prog.get("sections_total", 0)
                retries = prog.get("retries", 0)
                if total_s > 0:
                    label = f"{model_name} {done_s}/{total_s}"
                else:
                    label = f"{model_name} extraction"
                if retries > 0:
                    msg = f"Retrying section ({retries}x)..."
            else:
                label = f"{model_name} extraction"

        stages.append(PipelineStage(
            stage=label,
            status=st,
            message=msg,
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
            llm_provider=policy.llm_provider,
            created_at=policy.created_at,
            updated_at=policy.updated_at,
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


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a single policy and all related data."""
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    file_path = policy.original_file_path
    await db.delete(policy)
    await db.commit()
    try:
        Path(file_path).unlink(missing_ok=True)
    except Exception:
        pass


@router.delete("/policies", status_code=status.HTTP_200_OK)
async def delete_policies_by_status(
    status_filter: str = Query(..., alias="status"),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-delete policies by status (e.g. ?status=failed)."""
    result = await db.execute(select(Policy).where(Policy.status == status_filter))
    policies = result.scalars().all()
    if not policies:
        return {"deleted": 0}
    file_paths = [p.original_file_path for p in policies]
    for policy in policies:
        await db.delete(policy)
    await db.commit()
    for fp in file_paths:
        try:
            Path(fp).unlink(missing_ok=True)
        except Exception:
            pass
    return {"deleted": len(file_paths)}


@router.get("/changes")
async def list_changes(db: AsyncSession = Depends(get_db)):
    """Return audit log entries joined with policy metadata for the changes timeline."""
    result = await db.execute(
        select(AuditLog, Policy)
        .join(Policy, AuditLog.policy_id == Policy.id)
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    )
    rows = result.all()

    return [
        {
            "payerName": policy.payer_name or "Unknown Payer",
            "planName": policy.policy_type or "",
            "policyTitle": policy.title or policy.filename,
            "policyNumber": policy.policy_number or "",
            "versionNumber": 1,
            "effectiveDate": policy.effective_date or "",
            "changeSummary": audit.diff_summary,
            "diffJson": [
                {
                    "field": "status",
                    "old": "",
                    "new": audit.event_type,
                    "significance": audit.significance or "material",
                }
            ],
        }
        for audit, policy in rows
    ]
