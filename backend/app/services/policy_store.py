"""
Policy file storage and deduplication.

Manages the local policies/ directory tree:
  policies/
    {payer_slug}/
      {drug_slug}/
        {filename}           ← the policy PDF or HTML snapshot
        {filename}.meta.json ← sidecar metadata (URL, hash, date, ...)

Dedup rules:
  1. Same hash → skip (return is_new=False)
  2. Different hash, same drug/payer → save with versioned suffix (v2, v3…)
  3. New drug/payer → save as-is
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.logging import get_logger
from app.retrievers.base import FetchResult, compute_hash

log = get_logger(__name__)

# Root for all automatically-retrieved policy files
POLICIES_ROOT = Path("policies")


def payer_slug(name: str) -> str:
    """Normalize payer name to a safe directory component."""
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def drug_slug(name: str) -> str:
    """Normalize drug name to a safe directory component."""
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def get_policy_dir(payer: str, drug: str) -> Path:
    """Return (and create) the storage directory for this payer+drug pair."""
    d = POLICIES_ROOT / payer_slug(payer) / drug_slug(drug)
    d.mkdir(parents=True, exist_ok=True)
    return d


class PolicyStore:
    """
    Handles saving, versioning, and deduplication of retrieved policy files.
    """

    def save(self, result: FetchResult) -> FetchResult:
        """
        Persist a FetchResult to disk with dedup/versioning logic.
        Mutates `result.local_path`, `result.filename`, and `result.is_new`
        based on what already exists.
        Returns the (possibly updated) result.
        """
        if not result.success:
            return result  # nothing to store for errors

        store_dir = get_policy_dir(result.payer, result.drug_name)

        # Read the file that was written by the retriever
        raw_content: bytes | None = None
        if result.local_path and result.local_path.exists():
            raw_content = result.local_path.read_bytes()

        if raw_content is None:
            log.warning("PolicyStore: no content to store", result=result.filename)
            return result

        incoming_hash = compute_hash(raw_content)
        result.file_hash = incoming_hash

        # ── Check for existing files with the same hash ────────────────────
        for existing_meta_path in store_dir.glob("*.meta.json"):
            try:
                meta = json.loads(existing_meta_path.read_text())
                if meta.get("file_hash") == incoming_hash:
                    log.info(
                        "PolicyStore: dedup — identical file already stored",
                        payer=result.payer,
                        drug=result.drug_name,
                        existing=meta.get("filename"),
                    )
                    result.is_new = False
                    result.local_path = Path(meta["local_path"])
                    # Delete the temp file written by the retriever (if different path)
                    if result.local_path != existing_meta_path.with_suffix("").with_suffix(""):
                        try:
                            # Remove duplicate temp if it exists
                            pass
                        except Exception:
                            pass
                    return result
            except Exception:
                continue

        # ── New file — resolve versioned filename ──────────────────────────
        base_name = result.filename
        dest_path = store_dir / base_name

        if dest_path.exists():
            # Same filename but different hash → new version
            stem = dest_path.stem
            suffix = dest_path.suffix
            version = 2
            while dest_path.exists():
                dest_path = store_dir / f"{stem}_v{version}{suffix}"
                version += 1
            result.filename = dest_path.name

        # Move file from retriever's temp location into the store
        if result.local_path != dest_path:
            dest_path.write_bytes(raw_content)
            try:
                result.local_path.unlink(missing_ok=True)
            except Exception:
                pass
            result.local_path = dest_path

        # ── Write sidecar metadata JSON ────────────────────────────────────
        meta = {
            "payer": result.payer,
            "drug_name": result.drug_name,
            "source_url": result.source_url,
            "local_path": str(result.local_path),
            "content_type": result.content_type,
            "filename": result.filename,
            "file_hash": result.file_hash,
            "effective_date": result.effective_date,
            "retrieved_at": result.retrieved_at.isoformat(),
            "is_new": True,
        }
        meta_path = dest_path.with_suffix(dest_path.suffix + ".meta.json")
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        log.info(
            "PolicyStore: saved",
            payer=result.payer,
            drug=result.drug_name,
            file=str(result.local_path),
            hash=incoming_hash[:12],
        )
        result.is_new = True
        return result

    def list_stored(
        self, payer: Optional[str] = None, drug: Optional[str] = None
    ) -> list[dict]:
        """
        Return metadata for all stored policies, optionally filtered
        by payer and/or drug name.
        """
        root = POLICIES_ROOT
        if not root.exists():
            return []

        results = []
        for meta_path in root.glob("**/*.meta.json"):
            try:
                meta = json.loads(meta_path.read_text())
                if payer and payer_slug(meta.get("payer", "")) != payer_slug(payer):
                    continue
                if drug and drug_slug(meta.get("drug_name", "")) != drug_slug(drug):
                    continue
                results.append(meta)
            except Exception:
                continue

        results.sort(key=lambda m: m.get("retrieved_at", ""), reverse=True)
        return results
