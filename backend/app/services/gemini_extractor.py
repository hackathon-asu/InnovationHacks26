"""
Stage 2b: Structured extraction with Gemini — NLP-grounded.

The key upgrade from the research guide:
  We inject NLP pre-extraction results (drug names, ICD-10 codes, HCPCS J-codes)
  as grounding hints into the Gemini prompt. This:
    1. Dramatically reduces hallucination — Gemini confirms, not invents
    2. Catches codes that appear in tables (Docling's table extraction gives these)
    3. Enables section-by-section processing for long policies (10+ pages)

Also added vs initial version:
  - step_therapy as a structured list with step_number, min_duration, failure_definition
  - quantity_limits as structured objects (quantity + unit + period)
  - site_of_care requirements
  - provider/specialty requirements
  - clinical_criteria with AND/OR logic and nested children
  - ICD-10 codes per criterion
"""

import json
import re
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.policy import PolicyExtracted
from app.services.nlp_extractor import MedNLPResult

settings = get_settings()
log = get_logger(__name__)

genai.configure(api_key=settings.gemini_api_key)

EXTRACTION_SYSTEM_PROMPT = """
You are a precise medical benefit drug policy parser for a health insurance analysis system.
You will receive:
  1. The full text of a medical policy document
  2. NLP pre-extraction hints (drug names, ICD-10 codes, HCPCS J-codes already found by NER)

Your task: Return ONLY valid JSON matching the schema below.
No markdown, no explanation, no preamble. Start your response with '{'.

JSON SCHEMA:
{
  "payer_name": "string",
  "policy_number": "string or null",
  "title": "string or null",
  "effective_date": "YYYY-MM-DD or null",
  "policy_type": "oncology|rheumatology|neurology|cardiology|endocrinology|general|other",
  "drug_coverages": [
    {
      "drug_brand_name": "string",
      "drug_generic_name": "string or null",
      "drug_class": "string or null",
      "indication": "string or null",
      "rxcui": "string or null — RxNorm ID if mentioned in document",
      "j_code": "string or null — HCPCS J-code e.g. J9271",
      "coverage_status": "covered|not_covered|covered_with_criteria|experimental|not_addressed",
      "prior_auth_required": true/false,
      "clinical_criteria": [
        {
          "criterion_type": "diagnosis|step_therapy|lab_result|age|gender|provider_specialty|site_of_care|quantity_limit|duration_limit|documentation|comorbidity|contraindication|other",
          "logic_operator": "AND|OR|NOT or null",
          "description": "exact text of requirement from policy",
          "is_required": true/false,
          "icd10_codes": ["M06.9", "..."],
          "children": []
        }
      ],
      "step_therapy": [
        {
          "step_number": 1,
          "drug_or_class": "string",
          "min_duration": "string or null — e.g. '90 days'",
          "min_dose": "string or null",
          "failure_definition": "string or null",
          "contraindication_bypass": false
        }
      ],
      "quantity_limits": [
        {
          "quantity": 4,
          "unit": "vials",
          "period": "28 days",
          "max_daily_dose": "string or null",
          "notes": "string or null"
        }
      ],
      "site_of_care": {
        "preferred_site": "string or null",
        "allowed_sites": ["home_infusion", "physician_office"],
        "restricted_sites": ["hospital_outpatient"],
        "exception_criteria": "string or null"
      },
      "provider_requirements": [
        {
          "required_specialty": "string or null",
          "prescriber_type": "string or null",
          "consultation_required": false,
          "notes": "string or null"
        }
      ]
    }
  ]
}

RULES:
- Extract ALL drugs mentioned anywhere in the document.
- Use the NLP hints as a starting point — confirm or expand, never ignore hinted codes.
- For clinical_criteria: capture every individual requirement as its own object.
- For step_therapy: number steps in order. Step 1 = first drug patient must try.
- Prefer exact policy language in description fields — do not paraphrase criteria.
- If a field is genuinely absent, use null (never empty string).
- site_of_care: use null for the whole object if no site restrictions mentioned.
""".strip()


def _build_hint_block(nlp: MedNLPResult) -> str:
    """Format NLP pre-extraction results as a structured hint string for Gemini."""
    lines = ["=== NLP PRE-EXTRACTION HINTS (use these as grounding) ==="]

    if nlp.drug_names:
        lines.append(f"Drug names detected by NER: {', '.join(nlp.drug_names[:30])}")
    if nlp.hcpcs_codes:
        lines.append(f"HCPCS J-codes found by regex: {', '.join(nlp.hcpcs_codes)}")
    if nlp.icd10_codes:
        lines.append(f"ICD-10 codes found by regex: {', '.join(nlp.icd10_codes[:30])}")
    if nlp.quantity_hints:
        lines.append(f"Quantity patterns found: {'; '.join(nlp.quantity_hints[:10])}")
    if nlp.medication_entities:
        med7_drugs = [e["text"] for e in nlp.medication_entities if e["label"] == "DRUG"]
        if med7_drugs:
            lines.append(f"Med7 medication entities: {', '.join(dict.fromkeys(med7_drugs))[:20]}")

    lines.append("=== END HINTS ===")
    return "\n".join(lines)


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _split_into_sections(text: str, max_chars: int = 120_000) -> list[str]:
    """
    For very long policies (10+ pages), split by section for parallel processing.
    Returns list of text sections. Each will be sent to Gemini independently.
    """
    if len(text) <= max_chars:
        return [text]

    # Try splitting on section headers first
    section_breaks = list(re.finditer(
        r"\n(?=(?:CLINICAL CRITERIA|POLICY STATEMENT|APPLICABLE CODES|STEP THERAPY|"
        r"PRIOR AUTH|QUANTITY LIMIT|MEDICAL NECESSITY))",
        text, re.I
    ))

    if len(section_breaks) >= 2:
        sections = []
        prev = 0
        for m in section_breaks:
            if m.start() - prev > 500:
                sections.append(text[prev:m.start()])
                prev = m.start()
        sections.append(text[prev:])
        return sections

    # Fallback: split by character count with overlap
    sections = []
    overlap = 2000
    for i in range(0, len(text), max_chars - overlap):
        sections.append(text[i:i + max_chars])
    return sections


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, (json.JSONDecodeError, ValueError, ResourceExhausted, ServiceUnavailable))


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=20, max=120),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section(model, section_text: str, hint_block: str) -> dict:
    """Extract structured data from a single section of the policy."""
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    response = await model.generate_content_async(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.0,
            max_output_tokens=8192,
        ),
    )

    raw_json = _strip_json_fences(response.text)
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as e:
        log.warning("JSON parse failed, retrying", error=str(e), snippet=raw_json[:300])
        raise


def _merge_section_results(sections: list[dict]) -> dict:
    """
    Merge results from multiple section extractions into a single policy object.
    Drug coverages are deduplicated by brand name.
    """
    if not sections:
        return {}
    if len(sections) == 1:
        return sections[0]

    base = sections[0].copy()
    seen_drugs: set[str] = {d["drug_brand_name"].lower() for d in base.get("drug_coverages", [])}

    for section in sections[1:]:
        # Merge payer metadata from whichever section has it
        for field in ("payer_name", "policy_number", "effective_date", "title", "policy_type"):
            if not base.get(field) and section.get(field):
                base[field] = section[field]

        # Merge drug coverages (deduplicate by name)
        for drug in section.get("drug_coverages", []):
            name_key = drug.get("drug_brand_name", "").lower()
            if name_key and name_key not in seen_drugs:
                base.setdefault("drug_coverages", []).append(drug)
                seen_drugs.add(name_key)

    return base


async def extract_policy_structure(raw_text: str, nlp_result: MedNLPResult) -> PolicyExtracted:
    """
    Main entry point. Takes raw policy text + NLP hints → returns validated PolicyExtracted.
    Handles long policies by splitting into sections and merging results.
    """
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=EXTRACTION_SYSTEM_PROMPT,
    )

    hint_block = _build_hint_block(nlp_result)
    sections = _split_into_sections(raw_text)

    log.info("Sending to Gemini", sections=len(sections), total_chars=len(raw_text))

    if len(sections) == 1:
        data = await _extract_section(model, sections[0], hint_block)
    else:
        import asyncio
        section_results = await asyncio.gather(
            *[_extract_section(model, s, hint_block) for s in sections],
            return_exceptions=True
        )
        valid = [r for r in section_results if isinstance(r, dict)]
        data = _merge_section_results(valid)

    extracted = PolicyExtracted(**data)
    log.info("Gemini extraction complete",
             payer=extracted.payer_name,
             drugs=len(extracted.drug_coverages))
    return extracted
