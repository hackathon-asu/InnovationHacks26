"""
Main orchestrator — 8-stage pipeline incorporating research guide improvements.

Stages:
  1. parse          → Docling (primary) + Marker fallback
  2. nlp_extract    → scispaCy NER + Med7 + regex codes
  3. gemini_extract → Structured JSON (NLP-grounded)
  4. rxnorm         → Normalize drugs to RxCUI via NIH API
  5. save_postgres  → All structured tables (drugs, criteria, step therapy, etc.)
  6. chunk          → Paragraph-aware sliding window
  7. embed          → Gemini text-embedding-004, batched
  8. index          → pgvector with HNSW index + metadata filters
"""

import asyncio
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.policy import (
    AuditLog, ClinicalCriterion, CriterionIcdCode, DocumentChunk,
    DrugCoverage, Policy, ProviderRequirement, QuantityLimit,
    SiteOfCare, StepTherapy,
)
from app.services.chunker import chunk_document
from app.services.embedder import embed_chunks
from app.services.gemini_extractor import extract_policy_structure
from app.services.nlp_extractor import run_nlp_extraction
from app.services.pdf_parser import parse_document
from app.services.rxnorm_client import normalize_drug_list


@dataclass
class FetchContext:
    """
    Metadata produced by the fetch layer and forwarded to the ingestion pipeline
    as grounding hints.  All fields are optional so the pipeline degrades
    gracefully when a document is uploaded manually (no fetch context).
    """
    payer_name: str | None = None
    drug_name: str | None = None
    effective_date: str | None = None  # from URL / sidecar meta
    source_url: str | None = None
    content_type: str = "pdf"          # "pdf" | "html"

log = get_logger(__name__)

STAGE_PROGRESS = {
    "parsing":          10,
    "nlp_extracting":   20,
    "gemini_extracting":35,
    "rxnorm":           50,
    "saving_structured":65,
    "chunking":         75,
    "embedding":        88,
    "indexing":         96,
    "indexed":         100,
}


async def _set_status(policy_id: uuid.UUID, status: str, error: str | None = None):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Policy).where(Policy.id == policy_id))
        policy = result.scalar_one_or_none()
        if policy:
            policy.status = status
            if error:
                policy.error_message = error
            await db.commit()


async def _save_criterion(db: AsyncSession, coverage_id: uuid.UUID, criterion_data, parent_id=None):
    """Recursively save a clinical criterion and its children."""
    criterion = ClinicalCriterion(
        drug_coverage_id=coverage_id,
        parent_id=parent_id,
        criterion_type=criterion_data.criterion_type,
        logic_operator=criterion_data.logic_operator,
        description=criterion_data.description,
        is_required=criterion_data.is_required,
    )
    db.add(criterion)
    await db.flush()

    # ICD-10 codes linked to this criterion
    for code in (criterion_data.icd10_codes or []):
        db.add(CriterionIcdCode(criterion_id=criterion.id, icd10_code=code))

    # Recursive children (nested AND/OR logic)
    for child in (criterion_data.children or []):
        await _save_criterion(db, coverage_id, child, parent_id=criterion.id)


async def run_ingestion_pipeline(
    policy_id: uuid.UUID,
    file_path: Path,
    provider: str | None = None,
    fetch_context: FetchContext | None = None,
):
    """Full 8-stage pipeline. Runs as a FastAPI BackgroundTask."""
    log.info(
        "Pipeline starting",
        policy_id=str(policy_id),
        provider=provider,
        content_type=fetch_context.content_type if fetch_context else "pdf",
    )

    try:
        # ── Stage 1: Parse — routes PDF → Docling/Marker/pypdf, HTML → BS4 ──
        await _set_status(policy_id, "parsing")
        content_type = fetch_context.content_type if fetch_context else "pdf"
        parsed = await asyncio.to_thread(parse_document, file_path, content_type)

        # ── Stage 2: NLP pre-extraction ───────────────────────────────────────
        await _set_status(policy_id, "nlp_extracting")
        nlp_result = await asyncio.to_thread(run_nlp_extraction, parsed.full_text)

        # ── Stage 3: LLM structured extraction (NLP-grounded + fetch hints) ──
        await _set_status(policy_id, "gemini_extracting")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            policy_for_extraction = result.scalar_one()
            policy_for_extraction.llm_provider = provider or "ollama"
            await db.commit()

        # Build fetch-layer grounding hints so the LLM doesn't have to guess
        # the payer name or drug name when the retriever already knows them.
        fetch_hints: dict | None = None
        if fetch_context:
            fetch_hints = {
                k: v for k, v in {
                    "payer_name": fetch_context.payer_name,
                    "drug_name": fetch_context.drug_name,
                    "effective_date": fetch_context.effective_date,
                    "source_url": fetch_context.source_url,
                }.items() if v is not None
            } or None

        extracted = await extract_policy_structure(
            parsed.full_text,
            nlp_result,
            provider=provider,
            filename=policy_for_extraction.filename,
            fetch_hints=fetch_hints,
        )

        # ── Stage 4: RxNorm normalization ─────────────────────────────────────
        await _set_status(policy_id, "rxnorm")
        drug_names = [d.drug_brand_name for d in extracted.drug_coverages]
        if extracted.drug_coverages:
            normalized = await normalize_drug_list(drug_names)
        else:
            normalized = {}

        # ── Stage 5: Save to PostgreSQL ───────────────────────────────────────
        await _set_status(policy_id, "saving_structured")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            policy = result.scalar_one()

            # Update policy metadata from extraction.
            # Precedence: LLM extraction > regex from document > fetch-layer hint.
            policy.payer_name = extracted.payer_name or policy.payer_name
            policy.policy_number = extracted.policy_number
            policy.title = extracted.title
            policy.effective_date = (
                extracted.effective_date
                or parsed.metadata.get("effective_date")
                or (fetch_context.effective_date if fetch_context else None)
            )
            policy.policy_type = extracted.policy_type
            policy.page_count = parsed.page_count
            policy.file_hash = parsed.file_hash

            # Audit log entry (hash will anchor to Solana later)
            db.add(AuditLog(
                policy_id=policy_id,
                event_type="created",
                file_hash=parsed.file_hash,
                diff_summary=f"Initial ingestion: {len(extracted.drug_coverages)} drugs extracted from {parsed.page_count} pages",
                significance="material",
            ))

            # Save each drug coverage with all related data
            for drug_data in extracted.drug_coverages:
                # Merge RxNorm normalization data
                rxnorm_data = normalized.get(drug_data.drug_brand_name, {})

                coverage = DrugCoverage(
                    policy_id=policy_id,
                    drug_brand_name=drug_data.drug_brand_name,
                    drug_generic_name=drug_data.drug_generic_name or rxnorm_data.get("generic_name"),
                    drug_class=drug_data.drug_class,
                    indication=drug_data.indication,
                    rxcui=drug_data.rxcui or rxnorm_data.get("rxcui"),
                    j_code=drug_data.j_code,
                    ndc_codes=rxnorm_data.get("ndc_codes", []),
                    coverage_status=drug_data.coverage_status,
                    prior_auth_required=drug_data.prior_auth_required,
                    raw_extracted=drug_data.model_dump(),
                )
                db.add(coverage)
                await db.flush()   # need coverage.id for children

                # Clinical criteria (recursive tree)
                for criterion_data in drug_data.clinical_criteria:
                    await _save_criterion(db, coverage.id, criterion_data)

                # Step therapy (ordered)
                for step in drug_data.step_therapy:
                    db.add(StepTherapy(
                        drug_coverage_id=coverage.id,
                        step_number=step.step_number,
                        drug_or_class=step.drug_or_class,
                        min_duration=step.min_duration,
                        min_dose=step.min_dose,
                        failure_definition=step.failure_definition,
                        contraindication_bypass=step.contraindication_bypass,
                        sort_order=step.step_number,
                    ))

                # Quantity limits
                for ql in drug_data.quantity_limits:
                    db.add(QuantityLimit(
                        drug_coverage_id=coverage.id,
                        quantity=ql.quantity,
                        unit=ql.unit,
                        period=ql.period,
                        max_daily_dose=ql.max_daily_dose,
                        notes=ql.notes,
                    ))

                # Site of care
                if drug_data.site_of_care:
                    soc = drug_data.site_of_care
                    db.add(SiteOfCare(
                        drug_coverage_id=coverage.id,
                        preferred_site=soc.preferred_site,
                        allowed_sites=soc.allowed_sites,
                        restricted_sites=soc.restricted_sites,
                        exception_criteria=soc.exception_criteria,
                    ))

                # Provider requirements
                for pr in drug_data.provider_requirements:
                    db.add(ProviderRequirement(
                        drug_coverage_id=coverage.id,
                        required_specialty=pr.required_specialty,
                        prescriber_type=pr.prescriber_type,
                        consultation_required=pr.consultation_required,
                        notes=pr.notes,
                    ))

            await db.commit()
            log.info("Structured data saved", drugs=len(extracted.drug_coverages))

        # ── Stage 6: Chunk ────────────────────────────────────────────────────
        await _set_status(policy_id, "chunking")
        chunks = await asyncio.to_thread(chunk_document, parsed)

        # ── Stage 7: Embed (Gemini text-embedding-004, batched) ───────────────
        await _set_status(policy_id, "embedding")
        embeddings = await embed_chunks(chunks, provider=provider)

        # ── Stage 8: Index in pgvector ────────────────────────────────────────
        await _set_status(policy_id, "indexing")
        async with AsyncSessionLocal() as db:
            for chunk, embedding in zip(chunks, embeddings):
                db.add(DocumentChunk(
                    policy_id=policy_id,
                    chunk_index=chunk.chunk_index,
                    chunk_text=chunk.text,
                    page_number=chunk.page_number,
                    section_type=chunk.section_title,
                    embedding=embedding,
                    token_count=chunk.token_count,
                    chunk_metadata={
                        "payer_name": extracted.payer_name,
                        "policy_type": extracted.policy_type,
                        "drug_names": drug_names[:10],  # top 10 for metadata filtering
                    },
                ))
            await db.commit()
            log.info("Vectors indexed", chunks=len(chunks))

        await _set_status(policy_id, "indexed")
        log.info("Pipeline complete", policy_id=str(policy_id), provider=provider,
                 drugs=len(extracted.drug_coverages), chunks=len(chunks))

    except Exception as e:
        log.error("Pipeline failed", policy_id=str(policy_id), error=str(e))
        await _set_status(policy_id, "failed", error=str(e))
        raise
