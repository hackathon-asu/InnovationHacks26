"""
Priority Health policy retriever.

Priority Health consolidates ALL medical drug coverage into a single PDF:
  2026 Commercial Medical Drug List (one document covering all drugs).

Strategy:
  - Download the single consolidated PDF once (all drugs live in it)
  - For specific drug queries, the file is still downloaded and handed
    to the extraction pipeline which will extract the relevant sections

This adapter is extremely reliable because there is no HTML parsing needed —
it is a direct, known PDF download.
"""

import re
from pathlib import Path

from app.core.logging import get_logger
from app.retrievers.base import BasePolicyRetriever, FetchResult, build_client, compute_hash

log = get_logger(__name__)

# Direct link to Priority Health's 2026 commercial medical drug list PDF
# This URL pattern has been stable across years; update annually if needed
POLICY_PDF_URL = (
    "https://www.priorityhealth.com/content/dam/provider/docs/public/"
    "prior-auth/2026-PH-Medical-Drug-List.pdf"
)

# Fallback: Priority Health provider prior-auth overview page (HTML)
FALLBACK_URL = "https://www.priorityhealth.com/provider/manuals-forms/pharmacy/medical-drug-list"


class PriorityHealthRetriever(BasePolicyRetriever):
    payer_name = "Priority Health"

    async def search_and_fetch(
        self, drug_name: str, store_dir: Path
    ) -> list[FetchResult]:
        """
        Download Priority Health's consolidated medical drug list PDF.
        The same PDF covers all drugs, so drug_name is used only for
        metadata tagging — the full document is returned every time.
        """
        log.info("Priority Health retriever starting", drug=drug_name)

        async with build_client() as client:
            # ── Try direct PDF download ────────────────────────────────────────
            try:
                resp = await client.get(POLICY_PDF_URL)
                if resp.status_code == 200 and self._is_pdf(resp.content):
                    log.info("Priority Health: PDF downloaded", size=len(resp.content))
                    return [self._save_pdf(drug_name, POLICY_PDF_URL, resp.content, store_dir)]
            except Exception as exc:
                log.warning("Priority Health direct PDF failed", error=str(exc))

            # ── Fallback: capture the overview page as HTML ────────────────────
            log.info("Priority Health: falling back to HTML snapshot", drug=drug_name)
            try:
                from bs4 import BeautifulSoup
                resp = await client.get(FALLBACK_URL)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "lxml")
                text = soup.get_text(" ", strip=True)

                slug = re.sub(r"[^a-z0-9]+", "_", drug_name.lower())
                fname = f"priority_health_{slug}_overview.txt"
                dest = store_dir / fname
                dest.write_text(text[:50_000], encoding="utf-8")

                return [FetchResult(
                    payer=self.payer_name,
                    drug_name=drug_name,
                    source_url=FALLBACK_URL,
                    local_path=dest,
                    content_type="html",
                    filename=fname,
                    file_hash=compute_hash(text.encode()),
                    effective_date=None,
                    html_snapshot=text[:5_000],
                )]
            except Exception as exc:
                log.error("Priority Health fallback also failed", error=str(exc))
                return [self._error_result(
                    drug_name, POLICY_PDF_URL,
                    f"Priority Health unreachable: {exc}"
                )]

    def _is_pdf(self, content: bytes) -> bool:
        """Quick magic-byte check — PDFs start with %PDF."""
        return content[:4] == b"%PDF"

    def _save_pdf(
        self, drug_name: str, url: str, content: bytes, store_dir: Path
    ) -> FetchResult:
        """
        Save the consolidated PDF. Filename is payer-level, not drug-level,
        because this single document covers all medical benefit drugs.
        """
        fname = "priority_health_2026_medical_drug_list.pdf"
        dest = store_dir / fname
        dest.write_bytes(content)

        return FetchResult(
            payer=self.payer_name,
            drug_name=drug_name,
            source_url=url,
            local_path=dest,
            content_type="pdf",
            filename=fname,
            file_hash=compute_hash(content),
            # Effective date embedded in filename
            effective_date="2026",
        )
