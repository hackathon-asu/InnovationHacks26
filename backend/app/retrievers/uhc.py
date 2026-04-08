# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
UnitedHealthcare policy retriever.

UHC publishes individual Medical Benefit Drug Policy PDFs at:
  https://www.uhcprovider.com/en/policies-protocols/commercial-policies/
      commercial-medical-drug-policies.html

The index page is static HTML (Adobe AEM) with ~256 PDF links embedded.
No JavaScript rendering needed.

PDF URL pattern:
  /content/dam/provider/docs/public/policies/comm-medical-drug/{slug}.pdf

Strategy:
  1. Fetch the index page and scrape all PDF links
  2. Fuzzy-match drug name against link text AND href
  3. Fall back to direct URL construction if no match found
  4. Download the best matching PDF
"""

import re
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from app.retrievers.base import (
    BasePolicyRetriever, FetchResult, SearchResult,
    build_client, compute_hash, google_cse_search, DRUG_ALIASES,
)

log = get_logger(__name__)

INDEX_URL = (
    "https://www.uhcprovider.com/en/policies-protocols/commercial-policies/"
    "commercial-medical-drug-policies.html"
)
BASE_URL = "https://www.uhcprovider.com"
PDF_PATH_PREFIX = "/content/dam/provider/docs/public/policies/comm-medical-drug/"


class UHCRetriever(BasePolicyRetriever):
    payer_name = "UnitedHealthcare"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        log.info("UHC retriever starting", drug=drug_name)
        store_dir.mkdir(parents=True, exist_ok=True)

        async with build_client() as client:
            # ── Phase 0: Google Custom Search ────────────────────────────────
            raw = drug_name.lower().strip()
            alias = DRUG_ALIASES.get(raw.split()[0], "")
            names = [drug_name] + ([alias] if alias else [])
            cse_queries = [
                f'UnitedHealthcare "{n}" drug policy filetype:pdf'
                for n in names
            ]
            for q in cse_queries:
                for result in await google_cse_search(client, q):
                    url = result.url
                    if "uhcprovider.com" not in url.lower() or not url.lower().endswith(".pdf"):
                        continue
                    try:
                        pdf_resp = await client.get(url)
                        if pdf_resp.status_code == 200 and pdf_resp.content[:4] == b"%PDF":
                            log.info("UHC: PDF found via Google CSE", url=url)
                            return [self._save_pdf(drug_name, url, pdf_resp.content, store_dir)]
                    except Exception as exc:
                        log.warning("UHC: CSE PDF download failed", url=url, error=str(exc))

            # ── Step 1: Fetch index page ─────────────────────────────────────
            try:
                resp = await client.get(INDEX_URL)
                resp.raise_for_status()
            except Exception as exc:
                log.warning("UHC index fetch failed", error=str(exc))
                return [self._error_result(drug_name, INDEX_URL, f"Index unreachable: {exc}")]

            # ── Step 2: Find matching PDF links ──────────────────────────────
            soup = BeautifulSoup(resp.text, "lxml")
            pdf_urls = self._find_pdf_links(soup, drug_name)

            # ── Step 3: Try direct URL construction as fallback ──────────────
            if not pdf_urls:
                pdf_urls = self._construct_direct_urls(drug_name)

            if not pdf_urls:
                log.info("UHC: no PDF link found, capturing HTML snapshot", drug=drug_name)
                return [self._html_fallback(drug_name, INDEX_URL, resp.text, store_dir)]

            # ── Step 4: Download the best PDF ────────────────────────────────
            results: list[FetchResult] = []
            for url in pdf_urls[:2]:  # try top 2 matches
                try:
                    pdf_resp = await client.get(url)
                    if pdf_resp.status_code == 200 and pdf_resp.content[:4] == b"%PDF":
                        results.append(self._save_pdf(drug_name, url, pdf_resp.content, store_dir))
                        break  # got a valid PDF
                    log.info("UHC: URL did not return PDF", url=url, status=pdf_resp.status_code)
                except Exception as exc:
                    log.warning("UHC PDF download failed", url=url, error=str(exc))

            if results:
                return results

            # All PDF attempts failed — HTML fallback
            return [self._html_fallback(drug_name, INDEX_URL, resp.text, store_dir)]

    def _find_pdf_links(self, soup: BeautifulSoup, drug_name: str) -> list[str]:
        """
        Search all <a> tags for PDF links matching the drug name.
        Returns a list of URLs sorted by match quality (best first).
        """
        drug_lower = drug_name.lower().strip()
        # Try multiple name forms: full name, first word (brand), hyphenated
        name_variants = {drug_lower}
        name_variants.add(drug_lower.split()[0])
        name_variants.add(drug_lower.replace(" ", "-"))

        candidates: list[tuple[int, str]] = []

        for tag in soup.find_all("a", href=True):
            href: str = tag["href"]
            text: str = tag.get_text(" ", strip=True).lower()
            href_lower = href.lower()

            # Only consider links in the drug policy PDF path
            is_pdf = ".pdf" in href_lower
            is_policy_path = "comm-medical-drug" in href_lower or "policies" in href_lower

            if not (is_pdf or is_policy_path):
                continue

            score = 0
            for variant in name_variants:
                if variant in text:
                    score += 3
                if variant in href_lower:
                    score += 2

            if score > 0:
                full_url = href if href.startswith("http") else urljoin(BASE_URL, href)
                candidates.append((score, full_url))

        candidates.sort(key=lambda x: x[0], reverse=True)
        return [url for _, url in candidates]

    def _construct_direct_urls(self, drug_name: str) -> list[str]:
        """
        Construct candidate direct PDF URLs from the drug name.
        UHC uses kebab-case slugs: benlysta-belimumab.pdf, botulinum-toxins-a-and-b.pdf
        """
        slug = re.sub(r"[^a-z0-9]+", "-", drug_name.lower()).strip("-")
        name_parts = drug_name.lower().split()

        urls = [f"{BASE_URL}{PDF_PATH_PREFIX}{slug}.pdf"]

        # Try first word only (brand name)
        if len(name_parts) > 1:
            urls.append(f"{BASE_URL}{PDF_PATH_PREFIX}{name_parts[0]}.pdf")

        return urls

    def _html_fallback(
        self, drug_name: str, url: str, html: str, store_dir: Path
    ) -> FetchResult:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)

        slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
        fname = f"uhc_{slug}_index_snapshot_v2.txt"
        dest = store_dir / fname
        dest.write_text(text[:50_000], encoding="utf-8")

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
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
