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

import asyncio
import json
import re
import time
from typing import Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

import httpx
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

# Limit to 1 concurrent LLM call — Gemini free tier is 5 req/min; Ollama is single-threaded locally
_llm_semaphore = asyncio.Semaphore(1)

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


MINIMAL_EXTRACTION_SYSTEM_PROMPT = """
You are extracting only the minimum structured metadata from a medical policy document.
Return ONLY valid JSON. No markdown, no prose, no backticks.

JSON SCHEMA:
{
  "payer_name": "string",
  "policy_number": "string or null",
  "title": "string or null",
  "effective_date": "YYYY-MM-DD or MM/DD/YYYY or null",
  "policy_type": "oncology|rheumatology|neurology|cardiology|endocrinology|general|other|null",
  "drug_names": [
    {
      "drug_brand_name": "string",
      "drug_generic_name": "string or null",
      "j_code": "string or null"
    }
  ]
}

RULES:
- Extract the payer name if present.
- Extract all drug brand names you can identify from the title, tables, code sections, or policy body.
- If you are unsure about detailed coverage criteria, omit them because this schema does not include them.
- Use null for missing scalar fields.
- Return valid JSON only.
""".strip()


def _build_fetch_hint_block(hints: dict) -> str:
    """Format fetch-layer metadata as grounding context prepended to the NLP hints."""
    lines = ["=== FETCH METADATA (confirmed by retriever — use to ground extraction) ==="]
    if hints.get("payer_name"):
        lines.append(f"Payer (confirmed): {hints['payer_name']}")
    if hints.get("drug_name"):
        lines.append(f"Drug searched for: {hints['drug_name']}")
    if hints.get("effective_date"):
        lines.append(f"Effective date from URL/sidecar: {hints['effective_date']}")
    if hints.get("source_url"):
        lines.append(f"Source URL: {hints['source_url']}")
    lines.append("=== END FETCH METADATA ===")
    return "\n".join(lines)


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


def _parse_json_payload(text: str) -> dict:
    """
    Accept either raw JSON or a model response that wrapped JSON in prose/fences.
    Local models are especially prone to adding extra text before/after the object.
    """
    raw = _strip_json_fences(text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = raw[start:end + 1]
            return json.loads(candidate)
        raise


def _extract_json_candidate(text: str) -> str:
    raw = _strip_json_fences(text)
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        return raw[start:end + 1]
    return raw


def _dedupe_drug_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for entry in entries:
        name = (entry.get("drug_brand_name") or "").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append({
            "drug_brand_name": name,
            "drug_generic_name": entry.get("drug_generic_name"),
            "drug_class": None,
            "indication": None,
            "rxcui": None,
            "j_code": entry.get("j_code"),
            "coverage_status": "covered_with_criteria",
            "prior_auth_required": False,
            "clinical_criteria": [],
            "step_therapy": [],
            "quantity_limits": [],
            "site_of_care": None,
            "provider_requirements": [],
        })
    return deduped


FILENAME_DRUG_STOPWORDS = {
    "example", "sample", "policy", "medical", "corporate", "preferred",
    "injectable", "oncology", "program", "commercial", "medicare",
    "medicaid", "coverage", "criteria", "plan", "drug", "drugs",
}


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" -_:,")


def _extract_payer_candidates(text: str) -> list[str]:
    candidates: list[str] = []
    payer_patterns = [
        r"\bBCBS(?:\s+[A-Z]{2})?\b",
        r"\bBlue\s+Cross(?:\s+Blue\s+Shield)?\b",
        r"\bUHC\b",
        r"\bUnitedHealthcare\b",
        r"\bAetna\b",
        r"\bCigna\b",
        r"\bAnthem\b",
        r"\bHumana\b",
        r"\bKaiser(?:\s+Permanente)?\b",
        r"\bMolina\b",
        r"\bCentene\b",
    ]
    for pattern in payer_patterns:
        for match in re.finditer(pattern, text, re.I):
            candidate = _normalize_whitespace(match.group(0))
            if candidate and candidate not in candidates:
                candidates.append(candidate)
    return candidates


def _extract_filename_drugs(filename: str | None) -> list[str]:
    if not filename:
        return []

    stem = re.sub(r"\.pdf$", "", filename, flags=re.I)
    candidates: list[str] = []

    for group in re.findall(r"\(([^)]+)\)", stem):
        cleaned = re.sub(r"\b(?:example|sample)\b", "", group, flags=re.I)
        cleaned = _normalize_whitespace(cleaned)
        if cleaned and cleaned.lower() not in FILENAME_DRUG_STOPWORDS:
            candidates.append(cleaned)

    tail = stem.split(" - ", 1)[-1]
    for token in re.findall(r"\b[A-Z][a-zA-Z0-9-]{2,}\b", tail):
        lowered = token.lower()
        if lowered not in FILENAME_DRUG_STOPWORDS and token not in candidates:
            candidates.append(token)

    return candidates[:10]


def _extract_text_drugs(raw_text: str) -> list[str]:
    candidates: list[str] = []

    for match in re.finditer(r"\b(?:for|including|such as|drug[s]?:?)\s+([A-Z][a-zA-Z0-9-]{2,})", raw_text):
        token = match.group(1)
        if token not in candidates:
            candidates.append(token)

    for match in re.finditer(r"\b([A-Z][a-zA-Z0-9-]{2,})\s+\(([a-z][a-z0-9 -]{2,})\)", raw_text):
        token = match.group(1)
        if token not in candidates:
            candidates.append(token)

    return candidates[:10]


def _infer_title(raw_text: str, filename: str | None) -> str | None:
    if filename:
        stem = _normalize_whitespace(re.sub(r"\.pdf$", "", filename, flags=re.I))
        if stem:
            return stem

    for line in raw_text.splitlines():
        cleaned = _normalize_whitespace(line)
        if len(cleaned) > 12 and not cleaned.lower().startswith("page "):
            return cleaned
    return None


def _heuristic_policy_fallback(raw_text: str, nlp_result: MedNLPResult, filename: str | None = None) -> dict[str, Any]:
    text_window = raw_text[:5000]
    title = _infer_title(raw_text, filename)

    payer_name = ""
    payer_candidates = _extract_payer_candidates(text_window)
    if payer_candidates:
        payer_name = payer_candidates[0]
    elif filename and " - " in filename:
        payer_name = _normalize_whitespace(filename.split(" - ", 1)[0])

    drug_entries: list[dict[str, Any]] = []
    seen: set[str] = set()

    for name in nlp_result.drug_names:
        cleaned = _normalize_whitespace(name)
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            drug_entries.append({"drug_brand_name": cleaned, "drug_generic_name": None, "j_code": None})

    for entity in nlp_result.medication_entities:
        if entity.get("label") != "DRUG":
            continue
        cleaned = _normalize_whitespace(entity.get("text", ""))
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            drug_entries.append({"drug_brand_name": cleaned, "drug_generic_name": None, "j_code": None})

    for name in _extract_filename_drugs(filename):
        if name.lower() not in seen:
            seen.add(name.lower())
            drug_entries.append({"drug_brand_name": name, "drug_generic_name": None, "j_code": None})

    for name in _extract_text_drugs(text_window):
        if name.lower() not in seen:
            seen.add(name.lower())
            drug_entries.append({"drug_brand_name": name, "drug_generic_name": None, "j_code": None})

    if drug_entries and nlp_result.hcpcs_codes:
        drug_entries[0]["j_code"] = nlp_result.hcpcs_codes[0]

    return {
        "payer_name": payer_name,
        "policy_number": None,
        "title": title,
        "effective_date": None,
        "policy_type": "other",
        "drug_coverages": _dedupe_drug_entries(drug_entries),
    }


def _split_into_sections(text: str, max_chars: int = 40_000) -> list[str]:
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


def _split_into_sections_for_provider(text: str, provider: str | None) -> list[str]:
    if provider == "ollama":
        return _split_into_sections(text, max_chars=24_000)
    if provider == "groq":
        return _split_into_sections(text, max_chars=20_000)
    if provider == "nvidia":
        return _split_into_sections(text, max_chars=30_000)
    if provider == "anthropic":
        return _split_into_sections(text, max_chars=80_000)  # Claude has 200K context
    return _split_into_sections(text)


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, (json.JSONDecodeError, ValueError, ResourceExhausted, ServiceUnavailable, httpx.ReadTimeout, httpx.ConnectTimeout))


@retry(
    stop=stop_after_attempt(8),
    wait=wait_exponential(multiplier=2, min=30, max=180),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section(model, section_text: str, hint_block: str) -> dict:
    """Extract structured data from a single section of the policy (Gemini path)."""
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    async with _llm_semaphore:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.0,
                max_output_tokens=8192,
            ),
        )

    try:
        return _parse_json_payload(response.text)
    except json.JSONDecodeError as e:
        raw_json = _strip_json_fences(response.text)
        log.warning("JSON parse failed, retrying", error=str(e), snippet=raw_json[:300])
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section_ollama(section_text: str, hint_block: str) -> dict:
    """Extract structured data from a single section of the policy (Ollama path)."""
    # Reinforce key instructions for smaller models
    reinforcement = (
        "CRITICAL REMINDERS:\n"
        "- payer_name MUST be a non-empty string (e.g. 'UnitedHealthcare', 'Cigna', 'Blue Cross'). Look at the document header/title.\n"
        "- Extract EVERY drug mentioned. Do not skip any.\n"
        "- Return ONLY valid JSON. No thinking, no explanation, no markdown.\n\n"
    )
    prompt = f"{reinforcement}{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "format": "json",
                    "messages": [
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 8192, "num_ctx": 32768},
                },
            )
            resp.raise_for_status()
            content = resp.json()["message"]["content"]

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _strip_json_fences(content)
        log.warning("Ollama JSON parse failed", error=str(e), snippet=raw_json[:300])
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_minimal_section_ollama(section_text: str, hint_block: str) -> dict:
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "format": "json",
                    "messages": [
                        {"role": "system", "content": MINIMAL_EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 4096},
                },
            )
            resp.raise_for_status()
            content = resp.json()["message"]["content"]

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _extract_json_candidate(content)
        log.warning("Ollama minimal JSON parse failed", error=str(e), snippet=raw_json[:300])
        raise


# ── Groq rate-limit tracker ──────────────────────────────────────────────────
# Free tier: ~6000 tokens/min. We spend (limit - 500) per request, then sleep
# until the minute window resets.
_groq_window_start: float = 0.0
_groq_tokens_used: int = 0


async def _groq_rate_wait(requested_tokens: int):
    """Sleep if we'd exceed the per-minute token budget."""
    global _groq_window_start, _groq_tokens_used
    now = time.monotonic()
    budget = settings.groq_max_tokens_per_min - 500  # safety margin

    # Reset window if >60s elapsed
    if now - _groq_window_start >= 60:
        _groq_window_start = now
        _groq_tokens_used = 0

    if _groq_tokens_used + requested_tokens > budget:
        wait_secs = 60 - (now - _groq_window_start) + 1
        if wait_secs > 0:
            log.info("Groq rate limit — sleeping", wait=f"{wait_secs:.0f}s",
                     used=_groq_tokens_used, budget=budget)
            await asyncio.sleep(wait_secs)
        _groq_window_start = time.monotonic()
        _groq_tokens_used = 0


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=10, max=65),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section_groq(section_text: str, hint_block: str) -> dict:
    """Extract structured data via Groq API (OpenAI-compatible)."""
    global _groq_tokens_used
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"
    max_tokens = settings.groq_max_tokens_per_min - 500

    await _groq_rate_wait(max_tokens)

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": max_tokens,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            content = body["choices"][0]["message"]["content"]
            used = body.get("usage", {}).get("total_tokens", max_tokens)
            _groq_tokens_used += used
            log.info("Groq response", tokens_used=used, window_total=_groq_tokens_used)

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _strip_json_fences(content)
        log.warning("Groq JSON parse failed", error=str(e), snippet=raw_json[:300])
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_minimal_section_groq(section_text: str, hint_block: str) -> dict:
    global _groq_tokens_used
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"
    max_tokens = min(3000, settings.groq_max_tokens_per_min - 500)

    await _groq_rate_wait(max_tokens)

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": MINIMAL_EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            body = resp.json()
            content = body["choices"][0]["message"]["content"]
            used = body.get("usage", {}).get("total_tokens", max_tokens)
            _groq_tokens_used += used

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _extract_json_candidate(content)
        log.warning("Groq minimal JSON parse failed", error=str(e), snippet=raw_json[:300])
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section_nvidia(section_text: str, hint_block: str) -> dict:
    """Extract structured data via NVIDIA Build API (OpenAI-compatible)."""
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                f"{settings.nvidia_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
                json={
                    "model": settings.nvidia_model,
                    "messages": [
                        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": 8192,
                },
            )
            if resp.status_code == 404:
                raise RuntimeError(f"NVIDIA model '{settings.nvidia_model}' not found (404). Check NVIDIA_MODEL in .env")
            resp.raise_for_status()
            body = resp.json()
            content = body["choices"][0]["message"]["content"]

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _strip_json_fences(content)
        log.warning("NVIDIA JSON parse failed", error=str(e), snippet=raw_json[:300])
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception(_is_retryable),
)
async def _extract_section_anthropic(section_text: str, hint_block: str) -> dict:
    """Extract structured data via Anthropic Messages API."""
    prompt = f"{hint_block}\n\nPOLICY DOCUMENT SECTION:\n\n{section_text}"

    async with _llm_semaphore:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.anthropic_model,
                    "max_tokens": 8192,
                    "system": EXTRACTION_SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            content = body["content"][0]["text"]

    try:
        return _parse_json_payload(content)
    except json.JSONDecodeError as e:
        raw_json = _strip_json_fences(content)
        log.warning("Anthropic JSON parse failed", error=str(e), snippet=raw_json[:300])
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


def _merge_minimal_results(sections: list[dict]) -> dict:
    if not sections:
        return {}

    merged = {
        "payer_name": "",
        "policy_number": None,
        "title": None,
        "effective_date": None,
        "policy_type": None,
        "drug_names": [],
    }
    seen: set[str] = set()

    for section in sections:
        for field in ("payer_name", "policy_number", "title", "effective_date", "policy_type"):
            if not merged.get(field) and section.get(field):
                merged[field] = section[field]

        for drug in section.get("drug_names", []):
            name = (drug.get("drug_brand_name") or "").strip()
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            merged["drug_names"].append(drug)

    return merged


def _coerce_minimal_to_policy(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "payer_name": data.get("payer_name") or "",
        "policy_number": data.get("policy_number"),
        "title": data.get("title"),
        "effective_date": data.get("effective_date"),
        "policy_type": data.get("policy_type"),
        "drug_coverages": _dedupe_drug_entries(data.get("drug_names", [])),
    }


async def _extract_minimal_structure(
    raw_text: str,
    hint_block: str,
    provider: str,
    nlp_result: MedNLPResult,
    filename: str | None = None,
) -> dict[str, Any]:
    sections = _split_into_sections_for_provider(raw_text, provider)

    if provider == "ollama":
        if len(sections) == 1:
            merged = await _extract_minimal_section_ollama(sections[0], hint_block)
        else:
            results = await asyncio.gather(
                *[_extract_minimal_section_ollama(section, hint_block) for section in sections],
                return_exceptions=True,
            )
            merged = _merge_minimal_results([r for r in results if isinstance(r, dict)])
    elif provider == "groq":
        results = []
        for section in sections:
            try:
                results.append(await _extract_minimal_section_groq(section, hint_block))
            except Exception as e:
                log.warning("Groq minimal section failed", error=str(e))
        merged = _merge_minimal_results(results)
    else:
        return {}

    coerced = _coerce_minimal_to_policy(merged)
    if coerced.get("payer_name") or coerced.get("drug_coverages"):
        return coerced

    return _heuristic_policy_fallback(raw_text, nlp_result, filename)


async def extract_policy_structure(
    raw_text: str,
    nlp_result: MedNLPResult,
    provider: str | None = None,
    filename: str | None = None,
    fetch_hints: dict | None = None,
) -> PolicyExtracted:
    """
    Main entry point. Takes raw policy text + NLP hints → returns validated PolicyExtracted.
    Handles long policies by splitting into sections and merging results.
    Branches on settings.llm_provider: "ollama" or "gemini".

    fetch_hints: optional metadata from the retriever (payer_name, drug_name,
    effective_date, source_url). Prepended to the hint block so the LLM confirms
    rather than re-infers already-known facts.
    """
    nlp_hint_block = _build_hint_block(nlp_result)
    hint_block = (
        _build_fetch_hint_block(fetch_hints) + "\n\n" + nlp_hint_block
        if fetch_hints else nlp_hint_block
    )
    selected_provider = provider or settings.llm_provider
    sections = _split_into_sections_for_provider(raw_text, selected_provider)

    if selected_provider == "ollama":
        log.info("Sending to Ollama", model=settings.ollama_model, sections=len(sections), total_chars=len(raw_text))
        if len(sections) == 1:
            data = await _extract_section_ollama(sections[0], hint_block)
        else:
            section_results = await asyncio.gather(
                *[_extract_section_ollama(s, hint_block) for s in sections],
                return_exceptions=True
            )
            valid = [r for r in section_results if isinstance(r, dict)]
            data = _merge_section_results(valid)
    elif selected_provider == "groq":
        log.info("Sending to Groq", model=settings.groq_model, sections=len(sections), total_chars=len(raw_text))
        section_results = []
        for s in sections:
            try:
                result = await _extract_section_groq(s, hint_block)
                section_results.append(result)
            except Exception as e:
                log.warning("Groq section failed", error=str(e))
        data = _merge_section_results(section_results)
    elif selected_provider == "nvidia":
        log.info("Sending to NVIDIA", model=settings.nvidia_model, sections=len(sections), total_chars=len(raw_text))
        if len(sections) == 1:
            data = await _extract_section_nvidia(sections[0], hint_block)
        else:
            section_results = await asyncio.gather(
                *[_extract_section_nvidia(s, hint_block) for s in sections],
                return_exceptions=True
            )
            valid = [r for r in section_results if isinstance(r, dict)]
            data = _merge_section_results(valid)
    elif selected_provider == "anthropic":
        log.info("Sending to Anthropic", model=settings.anthropic_model, sections=len(sections), total_chars=len(raw_text))
        if len(sections) == 1:
            data = await _extract_section_anthropic(sections[0], hint_block)
        else:
            section_results = await asyncio.gather(
                *[_extract_section_anthropic(s, hint_block) for s in sections],
                return_exceptions=True
            )
            valid = [r for r in section_results if isinstance(r, dict)]
            data = _merge_section_results(valid)
    else:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=EXTRACTION_SYSTEM_PROMPT,
        )
        log.info("Sending to Gemini", sections=len(sections), total_chars=len(raw_text))
        if len(sections) == 1:
            data = await _extract_section(model, sections[0], hint_block)
        else:
            section_results = await asyncio.gather(
                *[_extract_section(model, s, hint_block) for s in sections],
                return_exceptions=True
            )
            valid = [r for r in section_results if isinstance(r, dict)]
            data = _merge_section_results(valid)

    if not data:
        if selected_provider in {"ollama", "groq"}:
            log.warning("Falling back to minimal extraction", provider=selected_provider)
            data = await _extract_minimal_structure(raw_text, hint_block, selected_provider, nlp_result, filename)
        if not data:
            raise RuntimeError("Structured extraction returned no valid JSON sections")

    # Sanitize: payer_name must be a string (LLMs sometimes return null)
    if data.get("payer_name") is None:
        data["payer_name"] = ""

    # Apply fetch-layer hints as a gap-fill — LLM output always wins,
    # hints only fill in fields the LLM left empty.
    if fetch_hints:
        if not data.get("payer_name") and fetch_hints.get("payer_name"):
            data["payer_name"] = fetch_hints["payer_name"]
            log.info("payer_name filled from fetch context", payer=data["payer_name"])
        if not data.get("effective_date") and fetch_hints.get("effective_date"):
            data["effective_date"] = fetch_hints["effective_date"]

    extracted = PolicyExtracted(**data)
    if not extracted.payer_name and not extracted.drug_coverages:
        if selected_provider in {"ollama", "groq"}:
            log.warning("Retrying with minimal extraction due to empty structured result", provider=selected_provider)
            fallback_data = await _extract_minimal_structure(raw_text, hint_block, selected_provider, nlp_result, filename)
            if fallback_data:
                if fetch_hints:
                    if not fallback_data.get("payer_name") and fetch_hints.get("payer_name"):
                        fallback_data["payer_name"] = fetch_hints["payer_name"]
                    if not fallback_data.get("effective_date") and fetch_hints.get("effective_date"):
                        fallback_data["effective_date"] = fetch_hints["effective_date"]
                extracted = PolicyExtracted(**fallback_data)
        if not extracted.payer_name and not extracted.drug_coverages:
            raise RuntimeError("Structured extraction returned no payer name or drug coverages")
    log.info("Extraction complete",
             provider=selected_provider,
             payer=extracted.payer_name,
             drugs=len(extracted.drug_coverages))
    return extracted
