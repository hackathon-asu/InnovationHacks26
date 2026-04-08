# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Priority Health policy retriever.

Priority Health's site is Gatsby-rendered (JS-heavy), so direct HTML scraping
of their policy listing pages doesn't work. However, their PDFs are served
from predictable Sitecore media paths:

  /-/media/priorityhealth/documents/medical-policies/{policy_number}.pdf
  /-/media/{SITECORE_GUID}.pdf

Strategy:
  1. Try downloading the known consolidated prior auth criteria PDF (GUID-based)
  2. Try the medical drug list page for any discoverable PDF links
  3. Fall back to capturing page text as HTML snapshot

The consolidated PA criteria document (~1.4MB) covers most drugs.
"""

import re
from pathlib import Path

from bs4 import BeautifulSoup

from app.core.logging import get_logger
from app.retrievers.base import (
    BasePolicyRetriever, FetchResult, SearchResult,
    build_client, compute_hash, google_cse_search, DRUG_ALIASES,
)

log = get_logger(__name__)

BASE_URL = "https://www.priorityhealth.com"

# Known consolidated PDFs (Sitecore media GUIDs, confirmed working 2026-04)
KNOWN_PDFS = [
    # Prior Auth Criteria document (~1.4MB, covers most drugs)
    {
        "url": f"{BASE_URL}/-/media/DAAE5553F48C4FDBA84BABBAE764BB84.pdf",
        "name": "priority_health_prior_auth_criteria.pdf",
        "desc": "Consolidated Prior Authorization Criteria",
    },
    # Second known PA criteria doc
    {
        "url": f"{BASE_URL}/-/media/81DACE8F00FF442799502209CC51780F.pdf",
        "name": "priority_health_pa_criteria_2.pdf",
        "desc": "Prior Authorization Criteria (alt)",
    },
]

# Pages to try scraping for PDF links (may have some static links)
SCRAPE_URLS = [
    f"{BASE_URL}/formulary/medical-drug-list/commercial-mypriority-current-year",
    f"{BASE_URL}/provider/manuals-forms/pharmacy/medical-drug-list",
]


class PriorityHealthRetriever(BasePolicyRetriever):
    payer_name = "Priority Health"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        log.info("Priority Health retriever starting", drug=drug_name)
        store_dir.mkdir(parents=True, exist_ok=True)

        async with build_client() as client:
            # ── Phase 0: Google Custom Search ────────────────────────────────
            raw = drug_name.lower().strip()
            alias = DRUG_ALIASES.get(raw.split()[0], "")
            names = [drug_name] + ([alias] if alias else [])
            cse_queries = [
                f'"priority health" "{n}" drug policy filetype:pdf'
                for n in names
            ]
            for q in cse_queries:
                for result in await google_cse_search(client, q):
                    url = result.url
                    if "priorityhealth.com" not in url.lower() or not url.lower().endswith(".pdf"):
                        continue
                    try:
                        pdf_resp = await client.get(url)
                        if pdf_resp.status_code == 200 and pdf_resp.content[:4] == b"%PDF":
                            log.info("Priority Health: PDF found via Google CSE", url=url)
                            return [self._save_pdf(drug_name, url, pdf_resp.content, store_dir)]
                    except Exception as exc:
                        log.warning("Priority Health: CSE PDF download failed", url=url, error=str(exc))

            # ── Step 1: Try known consolidated PDFs ──────────────────────────
            for pdf_info in KNOWN_PDFS:
                try:
                    resp = await client.get(pdf_info["url"])
                    if resp.status_code == 200 and self._is_pdf(resp.content):
                        log.info("Priority Health: consolidated PDF downloaded",
                                 url=pdf_info["url"], size=len(resp.content))
                        return [self._save_pdf(
                            drug_name, pdf_info["url"], resp.content,
                            store_dir, pdf_info["name"]
                        )]
                except Exception as exc:
                    log.warning("Priority Health PDF failed", url=pdf_info["url"], error=str(exc))

            # ── Step 2: Try scraping pages for any PDF links ─────────────────
            for page_url in SCRAPE_URLS:
                try:
                    resp = await client.get(page_url)
                    if resp.status_code != 200:
                        continue

                    soup = BeautifulSoup(resp.text, "lxml")

                    # Look for any PDF links on the page
                    for tag in soup.find_all("a", href=True):
                        href = tag["href"]
                        if ".pdf" not in href.lower():
                            continue
                        # Check if link text or href mentions the drug
                        text = tag.get_text(" ", strip=True).lower()
                        drug_lower = drug_name.lower()
                        if drug_lower in text or drug_lower in href.lower():
                            full_url = href if href.startswith("http") else BASE_URL + href
                            try:
                                pdf_resp = await client.get(full_url)
                                if pdf_resp.status_code == 200 and self._is_pdf(pdf_resp.content):
                                    return [self._save_pdf(
                                        drug_name, full_url, pdf_resp.content, store_dir
                                    )]
                            except Exception:
                                continue

                    # No drug-specific PDF found but page loaded — capture as HTML
                    log.info("Priority Health: page loaded but no drug PDF, capturing HTML", url=page_url)
                    return [self._html_fallback(drug_name, page_url, resp.text, store_dir)]

                except Exception as exc:
                    log.warning("Priority Health page scrape failed", url=page_url, error=str(exc))

            # ── Step 3: Everything failed ────────────────────────────────────
            return [self._error_result(
                drug_name, KNOWN_PDFS[0]["url"],
                "Priority Health: all PDF sources and fallback pages unreachable"
            )]

    def _is_pdf(self, content: bytes) -> bool:
        return len(content) > 1000 and content[:4] == b"%PDF"

    def _save_pdf(
        self, drug_name: str, url: str, content: bytes,
        store_dir: Path, filename: str | None = None
    ) -> FetchResult:
        if not filename:
            url_filename = url.rstrip("/").split("/")[-1].split("?")[0]
            if not url_filename.lower().endswith(".pdf"):
                slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
                url_filename = f"priority_health_{slug}_policy.pdf"
            filename = url_filename

        dest = store_dir / filename
        dest.write_bytes(content)

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
            local_path=dest,
            content_type="pdf",
            filename=filename,
            file_hash=compute_hash(content),
            effective_date="2026",
        )

    def _html_fallback(
        self, drug_name: str, url: str, html: str, store_dir: Path
    ) -> FetchResult:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)

        slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
        fname = f"priority_health_{slug}_overview_v2.txt"
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
