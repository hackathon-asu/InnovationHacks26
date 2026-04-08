# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Policy fetcher orchestrator.

Takes a drug name + list of payer names, runs the appropriate retrievers
in parallel, deduplicates results via PolicyStore, then hands each new
file into the existing 8-stage ingestion pipeline.

Entry point used by the /api/v1/fetch/policies route.
"""

import asyncio
import uuid
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.policy import Policy
from app.retrievers.base import FetchResult
from app.retrievers.cigna import CignaRetriever
from app.retrievers.priority_health import PriorityHealthRetriever
from app.retrievers.uhc import UHCRetriever
from app.services.ingestion_pipeline import FetchContext, run_ingestion_pipeline
from app.services.policy_store import PolicyStore, get_policy_dir

log = get_logger(__name__)
settings = get_settings()

# Registry of all available payer adapters (add more here as you build them)
RETRIEVER_REGISTRY: dict[str, type] = {
    "unitedhealthcare": UHCRetriever,
    "uhc": UHCRetriever,
    "cigna": CignaRetriever,
    "priority health": PriorityHealthRetriever,
    "priorityhealth": PriorityHealthRetriever,
}


def _resolve_retriever(payer_name: str):
    """Look up a retriever class by a normalized payer name (fuzzy match)."""
    key = payer_name.lower().strip().replace("-", " ").replace("_", " ")
    # Exact match first
    if key in RETRIEVER_REGISTRY:
        return RETRIEVER_REGISTRY[key]()
    # Prefix/substring match
    for registered_key, cls in RETRIEVER_REGISTRY.items():
        if registered_key in key or key in registered_key:
            return cls()
    return None


async def _fetch_for_payer(
    drug_name: str, payer_name: str, store: PolicyStore
) -> list[FetchResult]:
    """
    Run one retriever and persist results via the store.
    Errors are caught and returned as FetchResult with content_type="error".
    """
    retriever = _resolve_retriever(payer_name)
    if retriever is None:
        log.warning("No retriever found for payer", payer=payer_name)
        return []

    # Each retriever writes to a payer+drug-specific directory
    store_dir = get_policy_dir(payer_name, drug_name)

    try:
        results = await retriever.search_and_fetch(drug_name, store_dir)
    except Exception as exc:
        log.error("Retriever raised unexpectedly", payer=payer_name, drug=drug_name, error=str(exc))
        return []

    # Persist and dedup
    persisted: list[FetchResult] = []
    for r in results:
        try:
            r = store.save(r)
        except Exception as exc:
            log.error("Store.save failed", error=str(exc))
        persisted.append(r)

    return persisted


async def _find_ingested_policy(file_hash: str) -> Optional[uuid.UUID]:
    """
    Return the policy_id of an already-successfully-ingested record with this
    file hash, or None if no such record exists.
    Only status="indexed" counts — pending/failed records must be re-triggered.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Policy.id).where(
                Policy.file_hash == file_hash,
                Policy.status == "indexed",
            ).limit(1)
        )
        return result.scalar_one_or_none()


async def _create_policy_record(result: FetchResult, provider: str) -> Optional[uuid.UUID]:
    """
    Create a Policy DB record for a fetched file, then kick off ingestion.
    Returns the policy_id, or None if the record could not be created.
    """
    if not result.success or not result.local_path:
        return None

    policy_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        policy = Policy(
            id=policy_id,
            filename=result.filename,
            payer_name=result.payer,
            original_file_path=str(result.local_path),
            source_url=result.source_url,
            file_hash=result.file_hash or "",
            effective_date=result.effective_date,
            status="pending",
        )
        db.add(policy)
        await db.commit()

    log.info(
        "Policy record created for fetched file",
        policy_id=str(policy_id),
        file=result.filename,
        payer=result.payer,
    )
    return policy_id


async def run_auto_fetch(
    drug_name: str,
    payer_names: list[str],
    provider: str = "gemini",
    skip_pipeline: bool = False,
) -> dict:
    """
    Main entry point called by the /fetch/policies API route.

    1. Runs all payer retrievers in parallel
    2. Deduplicates via PolicyStore
    3. Creates Policy DB records for new/updated files
    4. Launches the ingestion pipeline for each new file (background)

    Returns a summary dict with per-payer results and policy_ids.
    """
    log.info("Auto-fetch starting", drug=drug_name, payers=payer_names)
    store = PolicyStore()

    # ── Run all retrievers concurrently ───────────────────────────────────────
    tasks = [_fetch_for_payer(drug_name, payer, store) for payer in payer_names]
    all_results_nested: list[list[FetchResult]] = await asyncio.gather(*tasks)
    all_results: list[FetchResult] = [r for sublist in all_results_nested for r in sublist]

    # ── Build per-payer summary ───────────────────────────────────────────────
    summary: list[dict] = []
    policy_ids: list[str] = []

    for result in all_results:
        entry: dict = {
            "payer": result.payer,
            "drug_name": result.drug_name,
            "source_url": result.source_url,
            "content_type": result.content_type,
            "filename": result.filename,
            "is_new": result.is_new,
            "file_hash": result.file_hash,
            "effective_date": result.effective_date,
            "error": result.error,
            "policy_id": None,
            "local_path": str(result.local_path) if result.local_path else None,
        }

        if result.success and not skip_pipeline:
            # "is_new=False" only means the file on disk hasn't changed.
            # Check the DB to see if it was ever successfully ingested.
            already_ingested_id: Optional[uuid.UUID] = None
            if not result.is_new and result.file_hash:
                already_ingested_id = await _find_ingested_policy(result.file_hash)

            if already_ingested_id:
                entry["policy_id"] = str(already_ingested_id)
                log.info("Skipping pipeline — already fully ingested",
                         payer=result.payer, policy_id=str(already_ingested_id))
            else:
                # New file OR existing file never successfully ingested.
                policy_id = await _create_policy_record(result, provider)
                if policy_id:
                    policy_ids.append(str(policy_id))
                    entry["policy_id"] = str(policy_id)
                    ctx = FetchContext(
                        payer_name=result.payer,
                        drug_name=result.drug_name,
                        effective_date=result.effective_date,
                        source_url=result.source_url,
                        content_type=result.content_type,
                    )
                    asyncio.create_task(
                        run_ingestion_pipeline(policy_id, result.local_path, provider, ctx)
                    )

        summary.append(entry)

    new_count = sum(1 for r in all_results if r.is_new and r.success)
    error_count = sum(1 for r in all_results if r.content_type == "error")

    log.info(
        "Auto-fetch complete",
        drug=drug_name,
        total=len(all_results),
        new=new_count,
        errors=error_count,
        policy_ids=policy_ids,
    )

    return {
        "drug_name": drug_name,
        "payers_requested": payer_names,
        "results": summary,
        "policy_ids": policy_ids,
        "new_files": new_count,
        "errors": error_count,
        "status": "complete",
    }
