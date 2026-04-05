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

# Cigna rebranded; try multiple known index URLs
INDEX_URLS = [
    "https://www.cigna.com/healthcare-professionals/coverage-and-claims/medical-coverage-policies",
    "https://static.cigna.com/assets/chcp/medical-coverage-policies",
    "https://www.cigna.com/healthcare-professionals/resources-for-health-care-professionals/"
    "clinical-payment-and-reimbursement-policies/medical-coverage-policies",
]
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
            # ── Step 1: Try multiple index URLs for PDF links ─────────────────
            pdf_url = await self._find_pdf_on_index(client, drug_name)

            if pdf_url:
                try:
                    pdf_resp = await client.get(pdf_url)
                    pdf_resp.raise_for_status()
                    return [self._save_pdf(drug_name, pdf_url, pdf_resp.content, store_dir)]
                except Exception as exc:
                    log.warning("Cigna PDF download failed", url=pdf_url, error=str(exc))

            # ── Step 2: Try direct PDF URL pattern ────────────────────────────
            slug = re.sub(r"[^a-z0-9]+", "-", drug_name.lower())
            direct_urls = [
                f"https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/{slug}.pdf",
                f"https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/{slug}.pdf",
            ]
            for url in direct_urls:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200 and resp.content[:4] == b"%PDF":
                        log.info("Cigna: found PDF via direct URL", url=url)
                        return [self._save_pdf(drug_name, url, resp.content, store_dir)]
                except Exception:
                    continue

            # ── Step 3: HTML fallback ─────────────────────────────────────────
            log.info("Cigna: no PDF found, falling back to HTML snapshot", drug=drug_name)
            return [await self._html_fallback(client, drug_name, store_dir)]

    async def _find_pdf_on_index(self, client, drug_name: str) -> str | None:
        """
        Try multiple Cigna index URLs and look for PDF links
        whose text or href contains the drug name.
        """
        resp = None
        for url in INDEX_URLS:
            try:
                resp = await client.get(url, follow_redirects=True)
                if resp.status_code == 200:
                    log.info("Cigna index found", url=url)
                    break
            except Exception as exc:
                log.warning("Cigna index URL failed", url=url, error=str(exc))
                continue

        if resp is None or resp.status_code != 200:
            log.warning("All Cigna index URLs failed")
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
        html = None
        used_url = INDEX_URLS[0]
        for url in INDEX_URLS:
            try:
                resp = await client.get(url, follow_redirects=True)
                if resp.status_code == 200:
                    html = resp.text
                    used_url = url
                    break
            except Exception:
                continue

        if html is None:
            return self._error_result(drug_name, used_url, f"Cigna unreachable: all index URLs returned errors")

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
