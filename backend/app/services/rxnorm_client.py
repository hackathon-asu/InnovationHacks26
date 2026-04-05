# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
RxNorm API client — free NIH drug normalization service.

Why: Drug names in policies appear in many forms ("adalimumab", "Humira", "adalimumab-atto").
RxNorm gives us a canonical RxCUI that works as a universal drug identifier across payers.

Key endpoints used:
  GET /REST/rxcui.json?name={name}           → RxCUI from drug name
  GET /REST/rxcui/{rxcui}/allrelated.json    → brand names, generics, dose forms
  GET /REST/rxcui/{rxcui}/ndcs.json          → NDC codes for this drug

HCPCS J-code crosswalk: CMS publishes HCPCS-to-NDC crosswalk quarterly.
We use the OpenFDA drug label API as a supplementary source for J-codes.

Rate limits: RxNav has no official rate limit but recommends < 20 req/sec.
We use a semaphore to be respectful.
"""

import asyncio
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.logging import get_logger

log = get_logger(__name__)

RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST"
OPENFDA_BASE = "https://api.fda.gov/drug"
REQUEST_SEMAPHORE = asyncio.Semaphore(10)   # max 10 concurrent requests to NIH



async def _get(client: httpx.AsyncClient, url: str, params: dict | None = None) -> dict:
    async with REQUEST_SEMAPHORE:
        resp = await client.get(url, params=params, timeout=10.0)
        resp.raise_for_status()
        return resp.json()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
async def lookup_rxcui(drug_name: str) -> Optional[str]:
    """
    Get RxCUI for a drug name.
    Returns None if not found — caller should proceed without normalization.
    """
    async with httpx.AsyncClient() as client:
        try:
            data = await _get(client, f"{RXNAV_BASE}/rxcui.json", {"name": drug_name, "search": 2})
            rxcui = data.get("idGroup", {}).get("rxnormId", [None])[0]
            if rxcui:
                log.debug("RxCUI found", drug=drug_name, rxcui=rxcui)
            return rxcui
        except Exception as e:
            log.warning("RxCUI lookup failed", drug=drug_name, error=str(e))
            return None


async def get_drug_details(rxcui: str) -> dict:
    """
    Given an RxCUI, fetch brand names, generic name, and related concepts.
    Returns a dict with: brand_names, generic_name, drug_class, ndc_codes.
    """
    result = {"rxcui": rxcui, "brand_names": [], "generic_name": None, "ndc_codes": []}

    async with httpx.AsyncClient() as client:
        try:
            # Get all related concepts (brand name, ingredients, dose forms)
            related = await _get(client, f"{RXNAV_BASE}/rxcui/{rxcui}/allrelated.json")
            concept_groups = related.get("allRelatedGroup", {}).get("conceptGroup", [])

            for group in concept_groups:
                tty = group.get("tty")  # term type
                props = group.get("conceptProperties", [])
                if tty == "IN":    # ingredient (generic)
                    if props:
                        result["generic_name"] = props[0].get("name")
                elif tty == "BN":  # brand name
                    result["brand_names"] = [p.get("name") for p in props]

            # Get NDC codes
            ndc_data = await _get(client, f"{RXNAV_BASE}/rxcui/{rxcui}/ndcs.json")
            result["ndc_codes"] = ndc_data.get("ndcGroup", {}).get("ndcList", {}).get("ndc", [])[:10]  # cap at 10

        except Exception as e:
            log.warning("Drug details fetch failed", rxcui=rxcui, error=str(e))

    return result


async def normalize_drug_list(drug_names: list[str]) -> dict[str, dict]:
    """
    Normalize a list of drug names to RxCUI + details in parallel.
    Returns dict mapping drug_name → {rxcui, generic_name, brand_names, ndc_codes}.
    """
    if not drug_names:
        return {}

    # Lookup RxCUIs in parallel
    rxcui_tasks = [lookup_rxcui(name) for name in drug_names]
    rxcuis = await asyncio.gather(*rxcui_tasks, return_exceptions=True)

    results: dict[str, dict] = {}
    detail_tasks = []
    drug_with_rxcui = []

    for drug_name, rxcui in zip(drug_names, rxcuis):
        if isinstance(rxcui, str):
            drug_with_rxcui.append(drug_name)
            detail_tasks.append(get_drug_details(rxcui))
        else:
            results[drug_name] = {"rxcui": None, "brand_names": [], "generic_name": None, "ndc_codes": []}

    if detail_tasks:
        details = await asyncio.gather(*detail_tasks, return_exceptions=True)
        for drug_name, detail in zip(drug_with_rxcui, details):
            if isinstance(detail, dict):
                results[drug_name] = detail
            else:
                results[drug_name] = {"rxcui": None}

    log.info("Drug normalization complete",
             total=len(drug_names),
             normalized=sum(1 for v in results.values() if v.get("rxcui")))
    return results
