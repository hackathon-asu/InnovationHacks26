# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
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

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"

# Common brand ↔ generic name pairs for drug policy searches.
# Payers use INN (generic) names in PDF titles; queries need both.
DRUG_ALIASES: dict[str, str] = {
    "humira": "adalimumab",
    "adalimumab": "humira",
    "rituxan": "rituximab",
    "rituximab": "rituxan",
    "keytruda": "pembrolizumab",
    "pembrolizumab": "keytruda",
    "opdivo": "nivolumab",
    "nivolumab": "opdivo",
    "dupixent": "dupilumab",
    "dupilumab": "dupixent",
    "stelara": "ustekinumab",
    "ustekinumab": "stelara",
    "entyvio": "vedolizumab",
    "vedolizumab": "entyvio",
    "cosentyx": "secukinumab",
    "secukinumab": "cosentyx",
    "skyrizi": "risankizumab",
    "risankizumab": "skyrizi",
    "tremfya": "guselkumab",
    "guselkumab": "tremfya",
    "enbrel": "etanercept",
    "etanercept": "enbrel",
    "remicade": "infliximab",
    "infliximab": "remicade",
    "orencia": "abatacept",
    "abatacept": "orencia",
    "xeljanz": "tofacitinib",
    "tofacitinib": "xeljanz",
    "rinvoq": "upadacitinib",
    "upadacitinib": "rinvoq",
    "olumiant": "baricitinib",
    "baricitinib": "olumiant",
}


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


@dataclass
class SearchResult:
    """One result item returned by google_cse_search."""
    title: str
    url: str
    snippet: str


async def google_cse_search(
    client: httpx.AsyncClient,
    query: str,
    num: int = 10,
) -> list[SearchResult]:
    """
    Search via Google Programmable Search Engine (Custom Search JSON API).

    Reads GOOGLE_CSE_KEY and GOOGLE_CSE_ID from settings/.env.
    Returns an empty list (not an exception) on any failure so callers can
    fall through to their existing scraping fallback.

    API docs: https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
    Free quota: 100 queries/day; $5 per 1000 after that.
    """
    settings = get_settings()

    if not settings.google_cse_key or not settings.google_cse_id:
        log.warning(
            "Google CSE not configured — set GOOGLE_CSE_KEY and GOOGLE_CSE_ID in .env"
        )
        return []

    try:
        resp = await client.get(
            GOOGLE_CSE_URL,
            params={
                "key": settings.google_cse_key,
                "cx": settings.google_cse_id,
                "q": query,
                "num": min(num, 10),  # API maximum is 10 per request
            },
        )
        log.info("Google CSE search", query=query, status=resp.status_code)

        if resp.status_code != 200:
            log.warning(
                "Google CSE non-200 response",
                status=resp.status_code,
                body=resp.text[:300],
            )
            return []

        data = resp.json()
        items = data.get("items", [])

        if not items:
            log.info("Google CSE: no results", query=query,
                     search_info=data.get("searchInformation", {}))
            return []

        results = [
            SearchResult(
                title=item.get("title", ""),
                url=item.get("link", ""),
                snippet=item.get("snippet", ""),
            )
            for item in items
            if item.get("link")
        ]
        log.info("Google CSE: results found", query=query, count=len(results),
                 urls=[r.url for r in results])
        return results

    except Exception as exc:
        log.warning("Google CSE search failed", query=query, error=str(exc))
        return []


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
