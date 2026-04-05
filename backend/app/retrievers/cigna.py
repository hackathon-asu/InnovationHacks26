# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Cigna policy retriever.

Cigna hosts coverage policy PDFs on their static CDN at static.cigna.com.
The A-Z index pages are pure static HTML (no JS rendering needed) with
838+ PDF links across pharmacy and medical categories.

Working index pages:
  - https://static.cigna.com/assets/chcp/resourceLibrary/coveragePolicies/pharmacy_a-z.html
  - https://static.cigna.com/assets/chcp/resourceLibrary/coveragePolicies/medical_a-z.html

PDF naming convention uses prefixes:
  ip_ = individual pharmacy, ph_ = pharmacy, mm_ = medical,
  st_ = step therapy, dqm_ = quantity mgmt, psm_ = specialty mgmt

Strategy:
  1. Scrape both pharmacy and medical A-Z index pages
  2. Fuzzy-match drug name against link text and href
  3. Download the best matching PDF(s)
"""

import re
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from app.retrievers.base import BasePolicyRetriever, FetchResult, build_client, compute_hash

log = get_logger(__name__)

# Working static CDN index pages (confirmed 2026-04)
INDEX_URLS = [
    "https://static.cigna.com/assets/chcp/resourceLibrary/coveragePolicies/pharmacy_a-z.html",
    "https://static.cigna.com/assets/chcp/resourceLibrary/coveragePolicies/medical_a-z.html",
]
STATIC_BASE = "https://static.cigna.com"


class CignaRetriever(BasePolicyRetriever):
    payer_name = "Cigna"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        log.info("Cigna retriever starting", drug=drug_name)
        store_dir.mkdir(parents=True, exist_ok=True)

        async with build_client() as client:
            # ── Step 1: Scrape both A-Z index pages for PDF links ────────────
            all_candidates: list[tuple[int, str, str]] = []  # (score, url, link_text)

            for index_url in INDEX_URLS:
                try:
                    resp = await client.get(index_url)
                    if resp.status_code == 200:
                        log.info("Cigna index loaded", url=index_url, size=len(resp.text))
                        candidates = self._find_pdf_links(resp.text, drug_name)
                        all_candidates.extend(candidates)
                except Exception as exc:
                    log.warning("Cigna index fetch failed", url=index_url, error=str(exc))

            if not all_candidates:
                log.warning("Cigna: no matching PDFs found on any index page", drug=drug_name)
                return [self._error_result(
                    drug_name, INDEX_URLS[0],
                    f"No policy PDFs found matching '{drug_name}' on Cigna"
                )]

            # Sort by match score (best first)
            all_candidates.sort(key=lambda x: x[0], reverse=True)

            # ── Step 2: Download the best matching PDF(s) ────────────────────
            results: list[FetchResult] = []
            tried = set()

            for score, pdf_url, link_text in all_candidates[:3]:
                if pdf_url in tried:
                    continue
                tried.add(pdf_url)

                try:
                    pdf_resp = await client.get(pdf_url)
                    if pdf_resp.status_code == 200 and pdf_resp.content[:4] == b"%PDF":
                        log.info("Cigna: PDF downloaded", url=pdf_url, score=score, text=link_text[:60])
                        results.append(self._save_pdf(drug_name, pdf_url, pdf_resp.content, store_dir))
                        break  # got one good PDF
                    else:
                        log.info("Cigna: URL not a PDF", url=pdf_url, status=pdf_resp.status_code)
                except Exception as exc:
                    log.warning("Cigna PDF download failed", url=pdf_url, error=str(exc))

            if results:
                return results

            # All downloads failed
            return [self._error_result(
                drug_name, all_candidates[0][1],
                f"Found {len(all_candidates)} candidate links but all PDF downloads failed"
            )]

    def _find_pdf_links(self, html: str, drug_name: str) -> list[tuple[int, str, str]]:
        """
        Parse an A-Z index page and find PDF links matching the drug name.
        Returns list of (score, url, link_text) tuples.
        """
        soup = BeautifulSoup(html, "lxml")
        drug_lower = drug_name.lower().strip()

        # Build multiple search variants
        name_variants = {drug_lower}
        name_variants.add(drug_lower.split()[0])  # brand name only
        # Common generic/brand swaps
        name_variants.add(drug_lower.replace(" ", "_"))
        name_variants.add(drug_lower.replace(" ", "-"))

        candidates: list[tuple[int, str, str]] = []

        for tag in soup.find_all("a", href=True):
            href: str = tag["href"]
            text: str = tag.get_text(" ", strip=True)
            text_lower = text.lower()
            href_lower = href.lower()

            # Only consider PDF links
            if ".pdf" not in href_lower:
                continue

            score = 0
            for variant in name_variants:
                if variant in text_lower:
                    score += 4  # text match is strongest signal
                if variant in href_lower:
                    score += 2

            # Boost for coverage policy specificity
            if "coverage" in text_lower or "criteria" in text_lower:
                score += 1

            if score > 0:
                # Resolve relative URLs against static CDN base
                if href.startswith("http"):
                    full_url = href
                elif href.startswith("//"):
                    full_url = "https:" + href
                elif href.startswith("/"):
                    full_url = STATIC_BASE + href
                else:
                    full_url = urljoin(STATIC_BASE + "/assets/chcp/resourceLibrary/coveragePolicies/", href)

                candidates.append((score, full_url, text))

        return candidates

    def _save_pdf(
        self, drug_name: str, url: str, content: bytes, store_dir: Path
    ) -> FetchResult:
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
