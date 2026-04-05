"""
Cigna policy retriever.

Cigna publishes Drug and Biologic Coverage Policies as PDFs, organized
by policy number and an A-Z index at:
  https://www.cigna.com/healthcare-professionals/resources-for-health-care-professionals/
      clinical-payment-and-reimbursement-policies/medical-coverage-policies

Strategy:
  1. Try Cigna's clinical policy search page (HTML)
  2. Scan anchor tags for drug-name matches that point to PDFs
  3. Download the best matching PDF
  4. Fall back to HTML text snapshot if no PDF is directly downloadable
"""

import re
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from app.retrievers.base import BasePolicyRetriever, FetchResult, build_client, compute_hash

log = get_logger(__name__)

# Cigna's clinical coverage policy index
INDEX_URL = (
    "https://www.cigna.com/healthcare-professionals/resources-for-health-care-professionals/"
    "clinical-payment-and-reimbursement-policies/medical-coverage-policies"
)
# Cigna also hosts PDFs under a static assets domain
STATIC_BASE = "https://static.cigna.com"
BASE_URL = "https://www.cigna.com"


class CignaRetriever(BasePolicyRetriever):
    payer_name = "Cigna"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        """Find and download Cigna policy PDF matching drug_name."""
        log.info("Cigna retriever starting", drug=drug_name)

        async with build_client() as client:
            # ── Step 1: Try the primary policy index page ─────────────────────
            pdf_url = await self._find_pdf_on_index(client, drug_name)

            if pdf_url:
                try:
                    pdf_resp = await client.get(pdf_url)
                    pdf_resp.raise_for_status()
                    return [self._save_pdf(drug_name, pdf_url, pdf_resp.content, store_dir)]
                except Exception as exc:
                    log.warning("Cigna PDF download failed", url=pdf_url, error=str(exc))
                    # fall through to HTML fallback

            # ── Step 2: HTML fallback — save what we can from the index ────────
            log.info("Cigna: falling back to HTML snapshot", drug=drug_name)
            return [await self._html_fallback(client, drug_name, store_dir)]

    async def _find_pdf_on_index(self, client, drug_name: str) -> str | None:
        """
        Fetch the Cigna coverage policy index and look for PDF links
        whose text or href contains the drug name.
        """
        try:
            resp = await client.get(INDEX_URL)
            resp.raise_for_status()
        except Exception as exc:
            log.warning("Cigna index fetch failed", error=str(exc))
            return None

        soup = BeautifulSoup(resp.text, "lxml")
        drug_lower = drug_name.lower().strip()
        drug_stem = drug_lower.split()[0]

        best_score = 0
        best_url: str | None = None

        for tag in soup.find_all("a", href=True):
            href: str = tag["href"]
            text: str = tag.get_text(" ", strip=True).lower()
            href_lower = href.lower()

            # Look for PDF links or drug policy paths
            is_pdf = ".pdf" in href_lower
            is_policy = any(k in href_lower for k in ("polic", "drug", "biolog", "coverage"))
            if not (is_pdf or is_policy):
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

            if score > best_score:
                best_score = score
                if href.startswith("http"):
                    best_url = href
                elif href.startswith("//"):
                    best_url = "https:" + href
                else:
                    best_url = urljoin(BASE_URL, href)

        return best_url if best_score > 0 else None

    async def _html_fallback(
        self, client, drug_name: str, store_dir: Path
    ) -> FetchResult:
        """
        When no PDF is found, capture the index page's visible text.
        This still feeds into the extraction pipeline as a text document.
        """
        try:
            resp = await client.get(INDEX_URL)
            resp.raise_for_status()
            html = resp.text
        except Exception as exc:
            return self._error_result(drug_name, INDEX_URL, f"Cigna unreachable: {exc}")

        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)

        slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
        fname = f"cigna_{slug}_index_snapshot.txt"
        dest = store_dir / fname
        dest.write_text(text[:50_000], encoding="utf-8")

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=INDEX_URL,
            local_path=dest,
            content_type="html",
            filename=fname,
            file_hash=compute_hash(text.encode()),
            effective_date=None,
            html_snapshot=text[:5_000],
        )

    def _save_pdf(
        self, drug_name: str, url: str, content: bytes, store_dir: Path
    ) -> FetchResult:
        """Write PDF bytes to disk."""
        url_filename = url.rstrip("/").split("/")[-1].split("?")[0]
        if not url_filename.lower().endswith(".pdf"):
            slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
            url_filename = f"cigna_{slug}_policy.pdf"

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
