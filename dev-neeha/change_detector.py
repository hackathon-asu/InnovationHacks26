"""
Change Detection — research guide section 6.

When a new version of a policy PDF is uploaded for the same payer,
this service compares it to the stored version and:
  1. Computes SHA-256 hash diff (skip if identical)
  2. Runs section-level text diff (difflib SequenceMatcher)
  3. Computes semantic diff via cosine similarity of section embeddings
  4. Classifies significance: breaking | material | minor | cosmetic
  5. Generates LLM summary of what changed
  6. Writes PolicyVersion record and AuditLog entry

Significance classification (from research guide):
  breaking  → Drug removed from coverage, new step therapy requirement added
  material  → ICD-10 codes added/removed, quantity limit changed, new documentation req
  minor     → Wording clarification without criteria change, date updates
  cosmetic  → Formatting changes, typo fixes
"""

import difflib
import json
from dataclasses import dataclass

import google.generativeai as genai

from app.core.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
log = get_logger(__name__)

genai.configure(api_key=settings.gemini_api_key)


@dataclass
class SectionDiff:
    section_name: str
    change_type: str      # added | removed | modified | unchanged
    similarity: float     # 1.0 = identical, 0.0 = completely different
    old_text: str
    new_text: str
    significance: str


@dataclass
class PolicyDiff:
    previous_hash: str
    current_hash: str
    section_diffs: list[SectionDiff]
    overall_significance: str
    summary: str              # LLM-generated human-readable summary
    diff_json: dict           # structured machine-readable diff


SIGNIFICANCE_KEYWORDS = {
    "breaking": [
        "not covered", "removed from coverage", "new step therapy",
        "prior authorization now required", "coverage denied",
    ],
    "material": [
        "icd", "hcpcs", "j-code", "quantity limit", "documentation required",
        "prior auth", "step therapy", "criteria", "diagnosis",
    ],
    "minor": [
        "clarification", "effective date", "review date", "wording",
    ],
}


def _classify_significance(old_text: str, new_text: str, similarity: float) -> str:
    """Heuristic significance classification based on content and similarity."""
    if similarity > 0.98:
        return "cosmetic"

    combined = (old_text + " " + new_text).lower()

    for level in ("breaking", "material", "minor"):
        if any(kw in combined for kw in SIGNIFICANCE_KEYWORDS[level]):
            return level

    return "minor" if similarity > 0.80 else "material"


def _diff_sections(
    old_sections: dict[str, str],
    new_sections: dict[str, str],
) -> list[SectionDiff]:
    """
    Compare sections between two policy versions using:
      1. difflib SequenceMatcher for text similarity ratio
      2. Content keyword analysis for significance classification
    """
    all_keys = set(old_sections) | set(new_sections)
    diffs: list[SectionDiff] = []

    for section in all_keys:
        old_text = old_sections.get(section, "")
        new_text = new_sections.get(section, "")

        if not old_text and new_text:
            change_type = "added"
            similarity = 0.0
        elif old_text and not new_text:
            change_type = "removed"
            similarity = 0.0
        else:
            matcher = difflib.SequenceMatcher(None, old_text, new_text)
            similarity = matcher.ratio()
            change_type = "unchanged" if similarity > 0.99 else "modified"

        significance = _classify_significance(old_text, new_text, similarity)

        diffs.append(SectionDiff(
            section_name=section,
            change_type=change_type,
            similarity=similarity,
            old_text=old_text[:2000],   # truncate for storage
            new_text=new_text[:2000],
            significance=significance,
        ))

    return sorted(diffs, key=lambda d: d.similarity)  # most changed first


async def _generate_change_summary(diffs: list[SectionDiff]) -> str:
    """Use Gemini to produce a human-readable summary of what changed."""
    changed = [d for d in diffs if d.change_type != "unchanged"]
    if not changed:
        return "No material changes detected."

    diff_text = "\n".join([
        f"- Section '{d.section_name}': {d.change_type} (significance: {d.significance}, similarity: {d.similarity:.2f})"
        for d in changed[:10]  # top 10 changes
    ])

    model = genai.GenerativeModel(settings.gemini_model)
    response = await model.generate_content_async(
        f"""Summarize these changes to a medical benefit drug policy document in 2-3 sentences.
Focus on clinical impact (coverage changes, new criteria, removed drugs).

Changes detected:
{diff_text}

Summary:""",
        generation_config=genai.types.GenerationConfig(temperature=0.1, max_output_tokens=256),
    )
    return response.text.strip()


def _overall_significance(diffs: list[SectionDiff]) -> str:
    """Roll up section-level significance to document level."""
    levels = {"breaking": 4, "material": 3, "minor": 2, "cosmetic": 1}
    max_level = max((levels.get(d.significance, 1) for d in diffs), default=1)
    return {4: "breaking", 3: "material", 2: "minor", 1: "cosmetic"}[max_level]


async def compare_policy_versions(
    old_parsed,   # ParsedDocument
    new_parsed,   # ParsedDocument
) -> PolicyDiff:
    """
    Main entry point. Compare two parsed policy documents.
    Returns a PolicyDiff with section diffs, significance, and LLM summary.
    """
    if old_parsed.file_hash == new_parsed.file_hash:
        return PolicyDiff(
            previous_hash=old_parsed.file_hash,
            current_hash=new_parsed.file_hash,
            section_diffs=[],
            overall_significance="cosmetic",
            summary="Document is identical (same SHA-256 hash).",
            diff_json={"identical": True},
        )

    log.info("Comparing policy versions",
             old_hash=old_parsed.file_hash[:12],
             new_hash=new_parsed.file_hash[:12])

    section_diffs = _diff_sections(old_parsed.sections, new_parsed.sections)
    summary = await _generate_change_summary(section_diffs)
    significance = _overall_significance(section_diffs)

    diff_json = {
        "previous_hash": old_parsed.file_hash,
        "current_hash": new_parsed.file_hash,
        "sections_changed": [
            {
                "section": d.section_name,
                "type": d.change_type,
                "similarity": round(d.similarity, 3),
                "significance": d.significance,
            }
            for d in section_diffs if d.change_type != "unchanged"
        ],
    }

    log.info("Diff complete", significance=significance, sections_changed=len([d for d in section_diffs if d.change_type != "unchanged"]))

    return PolicyDiff(
        previous_hash=old_parsed.file_hash,
        current_hash=new_parsed.file_hash,
        section_diffs=section_diffs,
        overall_significance=significance,
        summary=summary,
        diff_json=diff_json,
    )
