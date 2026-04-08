# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Batch-ingest all policy files from the hackathon examples directory.

Usage (from backend/):
    python -m scripts.batch_ingest

This script bypasses the LLM API entirely. Claude (Opus) pre-extracted
the structured JSON by reading each PDF directly. The script:
  1. parse         -> Docling/Marker/pypdf (existing python code)
  2. nlp_extract   -> scispaCy/regex (existing python code)
  3. LLM extract   -> SKIPPED — loads pre-generated JSON from scripts/extractions/
  4. rxnorm        -> NIH RxNorm API (existing python code, no auth needed)
  5. save_postgres -> all structured tables
  6. chunk         -> paragraph-aware sliding window
  7. embed         -> Ollama nomic-embed-text (or NVIDIA)
  8. index         -> pgvector with HNSW
"""

import asyncio
import json
import shutil
import uuid
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.db.session import init_db, AsyncSessionLocal
from app.models.policy import (
    AuditLog, ClinicalCriterion, CriterionIcdCode, DocumentChunk,
    DrugCoverage, Policy, ProviderRequirement, QuantityLimit,
    SiteOfCare, StepTherapy,
)
from app.schemas.policy import PolicyExtracted
from app.services.chunker import chunk_document
from app.services.embedder import embed_chunks
from app.services.nlp_extractor import run_nlp_extraction
from app.services.pdf_parser import parse_document
from app.services.rxnorm_client import normalize_drug_list

setup_logging()
log = get_logger(__name__)
settings = get_settings()

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
EXAMPLES_DIR = REPO_ROOT / "docs" / "hackathon" / "Medical Drug Coverage Policy Examples"
EXTRACTIONS_DIR = Path(__file__).resolve().parent / "extractions"

SUPPORTED_EXTENSIONS = {".pdf", ".docx"}

# Map each source file to its pre-extracted JSON
FILE_TO_EXTRACTION = {
    "BCBS NC - Corporate Medical Policy_ Preferred Injectable Oncology Program (Avastin example).pdf":
        "bcbs_nc_oncology.json",
    "Cigna Rituximab Intravenous Products for Non-Oncology Indications.pdf":
        "cigna_rituximab.json",
    "Florida Blue MCG Bevecizumab policy.pdf":
        "florida_blue_bevacizumab.json",
    "UHC Botulinum Toxins A and B \u2013 Commercial Medical Benefit Drug Policy.pdf":
        "uhc_botulinum.json",
    "Priority Health 2026 MDL - Priority Health Commercial (Employer Group) and MyPriority.pdf":
        "priority_health_mdl.json",
    "EmblemHealth_MPS_Denosumab_11_25_hcpcs.docx":
        None,  # skip DOCX for now — no extraction generated
}


async def _save_criterion(db, coverage_id, criterion_data, parent_id=None):
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

    for code in (criterion_data.icd10_codes or []):
        db.add(CriterionIcdCode(criterion_id=criterion.id, icd10_code=code))

    for child in (criterion_data.children or []):
        await _save_criterion(db, coverage_id, child, parent_id=criterion.id)


async def ingest_file(file_path: Path) -> None:
    """Full pipeline for one file, using pre-extracted JSON for stage 3."""
    extraction_file = FILE_TO_EXTRACTION.get(file_path.name)
    if extraction_file is None:
        log.warning("No extraction JSON for this file, skipping", file=file_path.name)
        return

    extraction_path = EXTRACTIONS_DIR / extraction_file
    if not extraction_path.exists():
        log.warning("Extraction JSON not found yet, skipping", path=str(extraction_path))
        return

    suffix = file_path.suffix.lower()
    policy_id = uuid.uuid4()
    dest = settings.upload_dir / f"{policy_id}{suffix}"

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file_path, dest)

    # Create pending Policy record
    async with AsyncSessionLocal() as db:
        policy = Policy(
            id=policy_id,
            filename=file_path.name,
            payer_name="",
            original_file_path=str(dest),
            file_hash="",
            status="pending",
            llm_provider="anthropic",
        )
        db.add(policy)
        await db.commit()

    log.info("Pipeline starting", policy_id=str(policy_id), file=file_path.name)

    try:
        # ── Stage 1: Parse ───────────────────────────────────────────────
        log.info("[1/8] Parsing document")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "parsing"; await db.commit()

        parsed = await asyncio.to_thread(parse_document, dest)

        # ── Stage 2: NLP extraction ──────────────────────────────────────
        log.info("[2/8] NLP extraction")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "nlp_extracting"; await db.commit()

        nlp_result = await asyncio.to_thread(run_nlp_extraction, parsed.full_text)
        log.info("NLP results",
                 drugs=len(nlp_result.drug_names),
                 j_codes=len(nlp_result.hcpcs_codes),
                 icd10=len(nlp_result.icd10_codes))

        # ── Stage 3: Load Claude's pre-extracted JSON (NO API CALL) ──────
        log.info("[3/8] Loading Claude-extracted JSON (no API call)")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "gemini_extracting"; await db.commit()

        raw_json = json.loads(extraction_path.read_text())
        if raw_json.get("payer_name") is None:
            raw_json["payer_name"] = ""
        extracted = PolicyExtracted(**raw_json)
        log.info("Extraction loaded",
                 payer=extracted.payer_name,
                 drugs=len(extracted.drug_coverages))

        # ── Stage 4: RxNorm normalization ────────────────────────────────
        log.info("[4/8] RxNorm normalization")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "rxnorm"; await db.commit()

        drug_names = [d.drug_brand_name for d in extracted.drug_coverages if d.drug_brand_name]
        normalized = await normalize_drug_list(drug_names) if drug_names else {}
        log.info("RxNorm results", normalized=len(normalized))

        # ── Stage 5: Save to PostgreSQL ──────────────────────────────────
        log.info("[5/8] Saving to PostgreSQL")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "saving_structured"; await db.commit()

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            policy = result.scalar_one()

            policy.payer_name = extracted.payer_name or policy.payer_name
            policy.policy_number = extracted.policy_number
            policy.title = extracted.title
            policy.effective_date = extracted.effective_date or parsed.metadata.get("effective_date")
            policy.policy_type = extracted.policy_type
            policy.page_count = parsed.page_count
            policy.file_hash = parsed.file_hash

            db.add(AuditLog(
                policy_id=policy_id,
                event_type="created",
                file_hash=parsed.file_hash,
                diff_summary=f"Claude-direct ingestion: {len(extracted.drug_coverages)} drugs from {parsed.page_count} pages",
                significance="material",
            ))

            for drug_data in extracted.drug_coverages:
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
                await db.flush()

                for criterion_data in drug_data.clinical_criteria:
                    await _save_criterion(db, coverage.id, criterion_data)

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

                for ql in drug_data.quantity_limits:
                    db.add(QuantityLimit(
                        drug_coverage_id=coverage.id,
                        quantity=ql.quantity,
                        unit=ql.unit,
                        period=ql.period,
                        max_daily_dose=ql.max_daily_dose,
                        notes=ql.notes,
                    ))

                if drug_data.site_of_care:
                    soc = drug_data.site_of_care
                    db.add(SiteOfCare(
                        drug_coverage_id=coverage.id,
                        preferred_site=soc.preferred_site,
                        allowed_sites=soc.allowed_sites,
                        restricted_sites=soc.restricted_sites,
                        exception_criteria=soc.exception_criteria,
                    ))

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

        # ── Stage 6: Chunk ───────────────────────────────────────────────
        log.info("[6/8] Chunking document")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "chunking"; await db.commit()

        chunks = await asyncio.to_thread(chunk_document, parsed)
        log.info("Chunks created", count=len(chunks))

        # ── Stage 7: Embed ───────────────────────────────────────────────
        log.info("[7/8] Embedding chunks")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "embedding"; await db.commit()

        embeddings = await embed_chunks(chunks)

        # ── Stage 8: Index in pgvector ───────────────────────────────────
        log.info("[8/8] Indexing in pgvector")
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "indexing"; await db.commit()

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
                        "drug_names": drug_names[:10],
                    },
                ))
            await db.commit()
            log.info("Vectors indexed", chunks=len(chunks))

        # ── Done ─────────────────────────────────────────────────────────
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one(); p.status = "indexed"; await db.commit()

        log.info("Pipeline complete",
                 policy_id=str(policy_id),
                 payer=extracted.payer_name,
                 drugs=len(extracted.drug_coverages),
                 chunks=len(chunks))

    except Exception as e:
        log.error("Pipeline failed", policy_id=str(policy_id), error=str(e))
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Policy).where(Policy.id == policy_id))
            p = result.scalar_one()
            if p:
                p.status = "failed"
                p.error_message = str(e)
                await db.commit()
        raise


async def main() -> None:
    if not EXAMPLES_DIR.is_dir():
        log.error("Examples directory not found", path=str(EXAMPLES_DIR))
        return

    files = sorted(
        f for f in EXAMPLES_DIR.iterdir()
        if f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        log.error("No PDF/DOCX files found", path=str(EXAMPLES_DIR))
        return

    log.info("=== Claude-Direct Batch Ingestion ===",
             file_count=len(files),
             extractions_dir=str(EXTRACTIONS_DIR),
             source=str(EXAMPLES_DIR))

    await init_db()

    succeeded = 0
    failed = 0
    skipped = 0

    for i, file_path in enumerate(files, 1):
        extraction_file = FILE_TO_EXTRACTION.get(file_path.name)
        if extraction_file is None:
            log.info(f"[{i}/{len(files)}] Skipping (no extraction)", file=file_path.name)
            skipped += 1
            continue

        extraction_path = EXTRACTIONS_DIR / extraction_file
        if not extraction_path.exists():
            log.warning(f"[{i}/{len(files)}] Skipping (extraction JSON missing)", file=file_path.name)
            skipped += 1
            continue

        log.info(f"[{i}/{len(files)}] Processing", file=file_path.name)
        try:
            await ingest_file(file_path)
            succeeded += 1
            log.info(f"[{i}/{len(files)}] Done", file=file_path.name)
        except Exception as e:
            failed += 1
            log.error(f"[{i}/{len(files)}] Failed", file=file_path.name, error=str(e))

    log.info("=== Batch ingestion complete ===",
             total=len(files),
             succeeded=succeeded,
             failed=failed,
             skipped=skipped)


if __name__ == "__main__":
    asyncio.run(main())
