# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
Stage 2a: Healthcare NLP extraction layer — runs BEFORE Gemini.

Research-recommended pipeline:
  scispaCy (en_core_sci_lg) — biomedical NER, entity linking to RxNorm/UMLS
  Med7                       — 7 medication concepts: drug, dosage, duration,
                               form, frequency, route, strength
  Regex extractors           — HCPCS J-codes, ICD-10, CPT codes (low-hanging fruit)

Why this matters:
  Running NER before Gemini gives us:
  1. Pre-extracted drug names / codes to ground the LLM prompt
  2. Regex-captured HCPCS/ICD-10 codes that Gemini might miss
  3. Structured hints that reduce hallucination in Gemini's JSON output

Output feeds directly into gemini_extractor.py as a "pre-extraction hint"
injected into the prompt.
"""

import re
from dataclasses import dataclass, field
from typing import Optional

from app.core.logging import get_logger

log = get_logger(__name__)

# ── Regex patterns for medical codes (high precision, low effort) ─────────────

# J-codes: J0000–J9999 (injectable drugs administered by providers)
JCODE_PATTERN = re.compile(r"\b(J\d{4})\b")
# CPT codes: 5-digit numeric
CPT_PATTERN = re.compile(r"\b(\d{5})\b")
# ICD-10-CM: Letter + 2 digits + optional decimal + 1-4 chars
ICD10_PATTERN = re.compile(r"\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b")
# RxCUI hint: sometimes explicitly present as "RxNorm: 12345"
RXCUI_PATTERN = re.compile(r"rxnorm[:\s]+(\d{3,8})", re.I)
# Quantity patterns: "4 vials per 28 days"
QUANTITY_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(vials?|tablets?|capsules?|mg|mcg|units?|doses?)"
    r"\s+(?:per|every|each)\s+(\d+\s+(?:days?|weeks?|months?)|month|week|day)",
    re.I
)


@dataclass
class MedicalCode:
    code: str
    code_type: str   # hcpcs_j | icd10 | cpt | rxcui
    context: str     # surrounding text snippet for verification


@dataclass
class MedNLPResult:
    """Output of the NLP pre-extraction stage."""
    drug_names: list[str] = field(default_factory=list)         # from scispaCy NER
    medication_entities: list[dict] = field(default_factory=list)  # from Med7 (drug+dose+route etc.)
    medical_codes: list[MedicalCode] = field(default_factory=list)
    icd10_codes: list[str] = field(default_factory=list)
    hcpcs_codes: list[str] = field(default_factory=list)
    cpt_codes: list[str] = field(default_factory=list)
    quantity_hints: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _extract_codes_regex(text: str) -> tuple[list[MedicalCode], list[str], list[str]]:
    """
    Fast regex extraction of structured codes — no model needed.
    Returns (all_codes, icd10_list, hcpcs_list).
    """
    codes: list[MedicalCode] = []
    icd10: list[str] = []
    hcpcs: list[str] = []
    cpt_found: set[str] = set()

    for m in JCODE_PATTERN.finditer(text):
        code = m.group(1)
        context = text[max(0, m.start()-40):m.end()+40].strip()
        codes.append(MedicalCode(code=code, code_type="hcpcs_j", context=context))
        hcpcs.append(code)

    for m in ICD10_PATTERN.finditer(text):
        code = m.group(1)
        # Filter out false positives — ICD-10 codes always start with a letter from a specific set
        if re.match(r"^[A-TV-Z]", code):
            context = text[max(0, m.start()-40):m.end()+40].strip()
            codes.append(MedicalCode(code=code, code_type="icd10", context=context))
            icd10.append(code)

    for m in CPT_PATTERN.finditer(text):
        code = m.group(1)
        if code not in cpt_found:
            cpt_found.add(code)
            codes.append(MedicalCode(code=code, code_type="cpt", context=""))

    return codes, list(dict.fromkeys(icd10)), list(dict.fromkeys(hcpcs))


def _extract_with_scispacy(text: str) -> list[str]:
    """
    scispaCy biomedical NER — extracts drug names, diseases, chemicals.
    Model: en_ner_bc5cdr_md (trained on BC5CDR corpus: drugs + diseases, F1 ~85.5).
    Falls back gracefully if model not installed.
    """
    try:
        import spacy
        # en_ner_bc5cdr_md is specialized for Chemical + Disease NER
        nlp = spacy.load("en_ner_bc5cdr_md")
        # Process in chunks to avoid memory issues on long docs
        chunk_size = 50_000
        drug_names: list[str] = []
        for i in range(0, len(text), chunk_size):
            doc = nlp(text[i:i + chunk_size])
            for ent in doc.ents:
                if ent.label_ == "CHEMICAL":
                    name = ent.text.strip()
                    if len(name) > 2:  # skip single chars
                        drug_names.append(name)
        # Deduplicate preserving order
        seen: set[str] = set()
        unique = [n for n in drug_names if not (n.lower() in seen or seen.add(n.lower()))]
        log.debug("scispaCy NER", drugs_found=len(unique))
        return unique
    except OSError:
        log.warning("scispaCy model en_ner_bc5cdr_md not found — skipping NER step. "
                    "Install with: pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz")
        return []
    except Exception as e:
        log.warning("scispaCy error", error=str(e))
        return []


def _extract_with_med7(text: str) -> list[dict]:
    """
    Med7 — extracts 7 medication entity types:
      DRUG | DOSAGE | DURATION | FORM | FREQUENCY | ROUTE | STRENGTH
    Returns list of entity dicts, one per medication mention.
    """
    try:
        import spacy
        med7 = spacy.load("en_core_med7_lg")
        chunk_size = 50_000
        entities: list[dict] = []
        for i in range(0, len(text), chunk_size):
            doc = med7(text[i:i + chunk_size])
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,  # DRUG | DOSAGE | etc.
                    "start_char": ent.start_char + i,
                })
        log.debug("Med7 extraction", entities=len(entities))
        return entities
    except OSError:
        log.warning("Med7 model not found — skipping. Install with: python -m spacy download en_core_med7_lg")
        return []
    except Exception as e:
        log.warning("Med7 error", error=str(e))
        return []


def _extract_quantity_hints(text: str) -> list[str]:
    """Extract quantity limit patterns as human-readable strings."""
    hints = []
    for m in QUANTITY_PATTERN.finditer(text):
        hints.append(m.group(0).strip())
    return list(dict.fromkeys(hints))


def run_nlp_extraction(text: str) -> MedNLPResult:
    """
    Full NLP pre-extraction pipeline. Results are injected as hints
    into the Gemini structured extraction prompt.
    """
    result = MedNLPResult()

    try:
        codes, icd10, hcpcs = _extract_codes_regex(text)
        result.medical_codes = codes
        result.icd10_codes = icd10
        result.hcpcs_codes = hcpcs
        result.cpt_codes = [c.code for c in codes if c.code_type == "cpt"]
    except Exception as e:
        result.errors.append(f"regex: {e}")

    result.drug_names = _extract_with_scispacy(text)
    result.medication_entities = _extract_with_med7(text)
    result.quantity_hints = _extract_quantity_hints(text)

    log.info("NLP extraction complete",
             drugs=len(result.drug_names),
             icd10=len(result.icd10_codes),
             hcpcs=len(result.hcpcs_codes),
             med7_entities=len(result.medication_entities))

    return result
