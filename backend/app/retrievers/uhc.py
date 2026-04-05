"""
UnitedHealthcare policy retriever.

UHC publishes individual Medical Benefit Drug Policy PDFs at:
  https://www.uhcprovider.com/en/policies-protocols/commercial-policies/
      commercial-medical-drug-policies.html

Strategy:
  1. Fetch the index page listing all drug policies
  2. Find <a> tags whose href or text contains the drug name
  3. Download the best matching PDF
  4. Fall back to HTML snapshot if no PDF link found
"""

import re
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from app.retrievers.base import BasePolicyRetriever, FetchResult, build_client, compute_hash

log = get_logger(__name__)

# UHC's public commercial drug policy index
INDEX_URL = (
    "https://www.uhcprovider.com/en/policies-protocols/commercial-policies/"
    "commercial-medical-drug-policies.html"
)
BASE_URL = "https://www.uhcprovider.com"


class UHCRetriever(BasePolicyRetriever):
    payer_name = "UnitedHealthcare"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        """Find and download UHC policy PDF matching drug_name."""
        log.info("UHC retriever starting", drug=drug_name)

        async with build_client() as client:
            # ── Step 1: Fetch the index page ──────────────────────────────────
            try:
                resp = await client.get(INDEX_URL)
                resp.raise_for_status()
            except Exception as exc:
                log.warning("UHC index fetch failed", error=str(exc))
                return [self._error_result(drug_name, INDEX_URL, f"Index unreachable: {exc}")]

            # ── Step 2: Parse HTML and find matching PDF links ─────────────────
            soup = BeautifulSoup(resp.text, "lxml")
            pdf_url = self._find_best_pdf_link(soup, drug_name)

            if not pdf_url:
                # No PDF found — capture page text as HTML snapshot fallback
                log.info("UHC: no PDF link found, capturing HTML snapshot", drug=drug_name)
                return [self._html_fallback(drug_name, INDEX_URL, resp.text, store_dir)]

            # ── Step 3: Download the PDF ───────────────────────────────────────
            try:
                pdf_resp = await client.get(pdf_url)
                pdf_resp.raise_for_status()
            except Exception as exc:
                log.warning("UHC PDF download failed", url=pdf_url, error=str(exc))
                return [self._error_result(drug_name, pdf_url, f"PDF download failed: {exc}")]

            content = pdf_resp.content
            return [self._save_pdf(drug_name, pdf_url, content, store_dir)]

    def _find_best_pdf_link(self, soup: BeautifulSoup, drug_name: str) -> str | None:
        """
        Search all <a> tags for the drug name (case-insensitive, partial match).
        Prefers exact drug-name matches; falls back to any link containing the name.
        Handles brand/generic name variants (e.g. "Rituxan" and "rituximab").
        """
        drug_lower = drug_name.lower().strip()
        # Also try the first word (brand names like "Rituxan MabThera" → "rituxan")
        drug_stem = drug_lower.split()[0] if drug_lower else drug_lower

        candidates: list[tuple[int, str]] = []  # (score, url)

        for tag in soup.find_all("a", href=True):
            href: str = tag["href"]
            text: str = tag.get_text(" ", strip=True).lower()
            href_lower = href.lower()

            # Only consider PDF links or known policy paths
            if not (".pdf" in href_lower or "polic" in href_lower or "drug" in href_lower):
                continue

            score = 0
            if drug_lower in text:
                score += 3
            if drug_lower in href_lower:
                score += 2
            if drug_stem in text:
                score += 1
            if drug_stem in href_lower:
                score += 1

            if score > 0:
                full_url = href if href.startswith("http") else urljoin(BASE_URL, href)
                candidates.append((score, full_url))

        if not candidates:
            return None

        # Return highest-scoring candidate
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    def _html_fallback(
        self, drug_name: str, url: str, html: str, store_dir: Path
    ) -> FetchResult:
        """Save a plain-text snapshot of the index page when no PDF is found."""
        # Extract visible text only — strip tags for cleaner storage
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)

        slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
        fname = f"uhc_{slug}_index_snapshot.txt"
        dest = store_dir / fname
        dest.write_text(text[:50_000], encoding="utf-8")  # cap at 50k chars

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
            local_path=dest,
            content_type="html",
            filename=fname,
            file_hash=compute_hash(text.encode()),
            effective_date=None,
            html_snapshot=text[:5_000],  # small preview for metadata
        )

    def _save_pdf(
        self, drug_name: str, url: str, content: bytes, store_dir: Path
    ) -> FetchResult:
        """Write PDF bytes to disk; derive filename from URL."""
        url_filename = url.rstrip("/").split("/")[-1].split("?")[0]
        if not url_filename.lower().endswith(".pdf"):
            slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
            url_filename = f"uhc_{slug}_policy.pdf"

        dest = store_dir / url_filename
        dest.write_bytes(content)

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
            local_path=dest,
            content_type="pdf",
            filename=url_filename,
            file_hash=compute_hash(content),
            effective_date=None,
        )
