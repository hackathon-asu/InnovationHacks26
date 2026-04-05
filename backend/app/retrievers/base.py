# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Base retriever interface and shared FetchResult dataclass.

All payer adapters implement BasePolicyRetriever.search_and_fetch(),
returning a list of FetchResult objects that policy_fetcher.py
then hands off to the ingestion pipeline.
"""

import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx


# Browser-like headers reduce bot-detection false positives on payer sites
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

REQUEST_TIMEOUT = 30  # seconds — generous for slow payer sites


@dataclass
class FetchResult:
    """One retrieved policy document (or failure record)."""
    payer: str
    drug_name: str
    source_url: str
    local_path: Optional[Path]    # absolute path to saved file; None on error
    content_type: str             # "pdf" | "html" | "error"
    filename: str
    file_hash: Optional[str]      # SHA-256 of file content
    effective_date: Optional[str]
    retrieved_at: datetime = field(default_factory=datetime.utcnow)
    is_new: bool = True           # False = identical file already stored (deduped)
    error: Optional[str] = None   # populated when content_type == "error"
    html_snapshot: Optional[str] = None  # raw HTML text for portal-based payers

    @property
    def success(self) -> bool:
        return self.content_type != "error" and self.local_path is not None


def compute_hash(data: bytes) -> str:
    """SHA-256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def build_client() -> httpx.AsyncClient:
    """Return a shared async HTTP client with sensible defaults."""
    return httpx.AsyncClient(
        headers=DEFAULT_HEADERS,
        timeout=REQUEST_TIMEOUT,
        follow_redirects=True,
        verify=True,
    )


class BasePolicyRetriever:
    """
    Abstract base class for payer-specific policy retrievers.

    Subclasses override `search_and_fetch` to implement payer-specific
    URL patterns, HTML parsing, and download logic.
    """
    payer_name: str = "unknown"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        """
        Search the payer's policy source for `drug_name` and download
        matching documents into `store_dir`.

        Returns a list of FetchResult (may be empty if nothing found).
        Implementations must never raise — catch and return an error result.
        """
        raise NotImplementedError

    def _error_result(self, drug_name: str, url: str, msg: str) -> FetchResult:
        """Helper to build a consistently-structured error result."""
        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
            local_path=None,
            content_type="error",
            filename="",
            file_hash=None,
            effective_date=None,
            error=msg,
            is_new=False,
        )
