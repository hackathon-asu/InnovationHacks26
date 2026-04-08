# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Two-pass extraction for mega-documents (e.g. UPMC, Priority Health).

These consolidate 50-200+ drug policies into one PDF. The standard section
splitter breaks because section headers (CLINICAL CRITERIA, STEP THERAPY, etc.)
repeat per drug — creating dozens of chunks — and _merge_section_results() only
keeps the first occurrence of each drug name, silently dropping all criteria
found in later chunks.

Strategy:
  Pass 1 — Drug discovery: send J-code lines + first 4k chars → Gemini returns
            a compact list of all drugs with their J-codes.
  Pass 2 — Per-drug extraction: find each drug's text window in the full doc →
            one Gemini call per drug → full structured extraction.

The document header (payer, date, policy #) is prepended to every per-drug call
so Gemini has context when processing mid-document sections.
"""

import asyncio
import re
from typing import Any

import google.generativeai as genai

from app.core.logging import get_logger
from app.services.nlp_extractor import MedNLPResult

log = get_logger(__name__)

# Thresholds to classify as mega-document
_MEGA_MIN_CHARS = 60_000
_MEGA_MIN_UNIQUE_DRUGS = 10
_MEGA_MIN_J_CODES = 8

_DRUG_TOC_PROMPT = """
This document covers MULTIPLE drugs. Return ONLY a JSON array listing every drug.
No prose, no markdown fences — start your response with '['.

Format:
[
  {{"drug_brand_name": "string", "drug_generic_name": "string or null", "j_code": "string or null"}},
  ...
]

NLP hints (use as cross-check, not as the only source):
{hint_block}

DOCUMENT EXCERPT (beginning + J-code index lines):
{text_window}
""".strip()

_PER_DRUG_PROMPT = """
Extract structured coverage data for ONE specific drug from this policy section.
Return ONLY valid JSON — no prose, no markdown fences, start with '{{'.

{{
  "drug_brand_name": "string",
  "drug_generic_name": "string or null",
  "drug_class": "string or null",
  "indication": "string or null",
  "j_code": "string or null",
  "coverage_status": "covered|not_covered|covered_with_criteria|experimental|not_addressed",
  "prior_auth_required": true,
  "clinical_criteria": [
    {{
      "criterion_type": "diagnosis|step_therapy|lab_result|age|gender|provider_specialty|site_of_care|quantity_limit|duration_limit|documentation|comorbidity|contraindication|other",
      "logic_operator": "AND|OR|NOT or null",
      "description": "exact policy text",
      "is_required": true,
      "icd10_codes": [],
      "children": []
    }}
  ],
  "step_therapy": [
    {{"step_number": 1, "drug_or_class": "string", "min_duration": null,
      "min_dose": null, "failure_definition": null, "contraindication_bypass": false}}
  ],
  "quantity_limits": [],
  "site_of_care": null,
  "provider_requirements": []
}}

DOCUMENT HEADER (payer / date context):
{header_context}

SECTION FOR DRUG: {drug_name}
{drug_section}
""".strip()


def is_mega_document(raw_text: str, nlp_result: MedNLPResult) -> bool:
    """Return True if this looks like a multi-drug consolidated policy document."""
    if len(raw_text) < _MEGA_MIN_CHARS:
        return False
    unique_drugs = len({d.lower() for d in nlp_result.drug_names})
    unique_j_codes = len(nlp_result.hcpcs_codes)
    return unique_drugs >= _MEGA_MIN_UNIQUE_DRUGS or unique_j_codes >= _MEGA_MIN_J_CODES


def _build_toc_window(raw_text: str) -> str:
    """
    Build a focused window for the drug-discovery pass:
    - First 4000 chars (usually has title, payer, drug index or table of contents)
    - Lines containing J-codes anywhere in the document (drug identifiers)
    """
    first_block = raw_text[:4000]
    j_code_lines = [
        line for line in raw_text.splitlines()
        if re.search(r"\bJ\d{4}\b", line)
    ]
    j_block = "\n".join(j_code_lines[:100])
    if j_block and j_block not in first_block:
        return (first_block + "\n\n[J-CODE LINES]:\n" + j_block)[:8000]
    return first_block[:8000]


def _find_drug_segment(raw_text: str, drug_name: str, j_code: str | None, window: int = 5000) -> str:
    """
    Locate the text section for a single drug inside a mega-document.

    Finds all occurrences of the drug name, then picks the one nearest to
    the drug's J-code (if known). Returns `window` chars starting ~200 chars
    before the best match so paragraph context is preserved.
    """
    text_lower = raw_text.lower()
    name_lower = drug_name.lower()

    positions: list[int] = []
    for m in re.finditer(r"\b" + re.escape(name_lower) + r"\b", text_lower):
        positions.append(m.start())

    if not positions:
        idx = text_lower.find(name_lower)
        if idx == -1:
            return ""
        positions = [idx]

    best_pos = positions[0]
    if j_code and len(positions) > 1:
        j_positions = [m.start() for m in re.finditer(re.escape(j_code.lower()), text_lower)]
        if j_positions:
            best_pos = min(positions, key=lambda p: min(abs(p - j) for j in j_positions))

    start = max(0, best_pos - 200)
    return raw_text[start: start + window]


async def _discover_drugs(
    model,
    raw_text: str,
    nlp_result: MedNLPResult,
    hint_block: str,
    llm_semaphore: asyncio.Semaphore,
) -> list[dict[str, Any]]:
    """Pass 1: ask Gemini to enumerate all drugs in the document."""
    from app.services.gemini_extractor import _parse_json_payload

    toc_window = _build_toc_window(raw_text)
    prompt = _DRUG_TOC_PROMPT.format(hint_block=hint_block, text_window=toc_window)

    async with llm_semaphore:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0, max_output_tokens=4096
            ),
        )

    try:
        result = _parse_json_payload(response.text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            for key in ("drugs", "drug_list", "items"):
                if isinstance(result.get(key), list):
                    return result[key]
    except Exception as e:
        log.warning("Drug TOC extraction failed, falling back to NLP hints", error=str(e))

    # Fallback: use NLP-detected drug names
    return [
        {"drug_brand_name": name, "drug_generic_name": None, "j_code": None}
        for name in nlp_result.drug_names[:60]
    ]


async def _extract_one_drug(
    model,
    raw_text: str,
    drug_entry: dict[str, Any],
    header_context: str,
    llm_semaphore: asyncio.Semaphore,
) -> dict[str, Any] | None:
    """Pass 2: full structured extraction for a single drug's section."""
    from app.services.gemini_extractor import _parse_json_payload

    drug_name: str = (drug_entry.get("drug_brand_name") or "").strip()
    j_code: str | None = drug_entry.get("j_code")

    if not drug_name:
        return None

    drug_section = _find_drug_segment(raw_text, drug_name, j_code)
    if not drug_section:
        log.debug("Drug section not found in mega-doc", drug=drug_name)
        return None

    prompt = _PER_DRUG_PROMPT.format(
        header_context=header_context,
        drug_name=drug_name,
        drug_section=drug_section,
    )

    try:
        async with llm_semaphore:
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.0, max_output_tokens=4096
                ),
            )
        result = _parse_json_payload(response.text)
        if isinstance(result, dict) and result.get("drug_brand_name"):
            return result
    except Exception as e:
        log.warning("Per-drug extraction failed", drug=drug_name, error=str(e))

    # Return a minimal stub so the drug at least appears in the output
    return {
        "drug_brand_name": drug_name,
        "drug_generic_name": drug_entry.get("drug_generic_name"),
        "drug_class": None,
        "indication": None,
        "j_code": j_code,
        "coverage_status": "covered_with_criteria",
        "prior_auth_required": False,
        "clinical_criteria": [],
        "step_therapy": [],
        "quantity_limits": [],
        "site_of_care": None,
        "provider_requirements": [],
    }


async def extract_mega_document(
    model,
    raw_text: str,
    nlp_result: MedNLPResult,
    hint_block: str,
    llm_semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    """
    Orchestrate two-pass extraction for a multi-drug mega-document.
    Returns a dict that matches the PolicyExtracted schema.
    """
    from app.services.gemini_extractor import _extract_payer_candidates

    log.info("Mega-document mode — two-pass extraction", chars=len(raw_text))
    header_context = raw_text[:1500].strip()

    # Pass 1: drug discovery
    drug_list = await _discover_drugs(model, raw_text, nlp_result, hint_block, llm_semaphore)
    log.info("Drug discovery complete", discovered=len(drug_list))

    if not drug_list:
        return {}

    # Pass 2: per-drug extraction (max 3 concurrent to respect rate limits)
    slot = asyncio.Semaphore(3)

    async def _throttled(entry: dict) -> dict | None:
        async with slot:
            return await _extract_one_drug(model, raw_text, entry, header_context, llm_semaphore)

    results = await asyncio.gather(*[_throttled(d) for d in drug_list], return_exceptions=True)
    drug_coverages = [r for r in results if isinstance(r, dict)]

    # Extract payer / date from header
    payer_name = ""
    payer_candidates = _extract_payer_candidates(header_context)
    if payer_candidates:
        payer_name = payer_candidates[0]

    effective_date: str | None = None
    date_m = re.search(
        r"effective\s+(?:date[:\s]+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        header_context, re.I,
    )
    if date_m:
        effective_date = date_m.group(1)

    policy_number: str | None = None
    pol_m = re.search(r"policy\s+(?:number|#|no\.?)[:\s]+([A-Z0-9\-]+)", header_context, re.I)
    if pol_m:
        policy_number = pol_m.group(1)

    log.info("Mega-document extraction complete", drugs=len(drug_coverages))
    return {
        "payer_name": payer_name,
        "policy_number": policy_number,
        "title": None,
        "effective_date": effective_date,
        "policy_type": "general",
        "drug_coverages": drug_coverages,
    }
