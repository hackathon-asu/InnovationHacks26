# --------0x0x0x0x0x0-----------
# InsightRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""Pydantic schemas — request/response models and extraction schemas."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ── Gemini extraction schemas ─────────────────────────────────────────────────

class ClinicalCriterionExtracted(BaseModel):
    criterion_type: str = "other"
    logic_operator: Optional[str] = None
    description: str = ""
    is_required: bool = True
    icd10_codes: list[str] = []
    children: list["ClinicalCriterionExtracted"] = []

    model_config = ConfigDict(extra="ignore")


ClinicalCriterionExtracted.model_rebuild()


class StepTherapyExtracted(BaseModel):
    step_number: int = 1
    drug_or_class: str = ""
    min_duration: Optional[str] = None
    min_dose: Optional[str] = None
    failure_definition: Optional[str] = None
    contraindication_bypass: bool = False

    model_config = ConfigDict(extra="ignore")


class QuantityLimitExtracted(BaseModel):
    quantity: float = 0
    unit: str = ""
    period: str = ""
    max_daily_dose: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class SiteOfCareExtracted(BaseModel):
    preferred_site: Optional[str] = None
    allowed_sites: list[str] = []
    restricted_sites: list[str] = []
    exception_criteria: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class ProviderRequirementExtracted(BaseModel):
    required_specialty: Optional[str] = None
    prescriber_type: Optional[str] = None
    consultation_required: bool = False
    notes: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class DrugCoverageExtracted(BaseModel):
    drug_brand_name: str
    drug_generic_name: Optional[str] = None
    drug_class: Optional[str] = None
    indication: Optional[str] = None
    rxcui: Optional[str] = None
    j_code: Optional[str] = None
    coverage_status: str = "covered_with_criteria"
    prior_auth_required: bool = False
    clinical_criteria: list[ClinicalCriterionExtracted] = []
    step_therapy: list[StepTherapyExtracted] = []
    quantity_limits: list[QuantityLimitExtracted] = []
    site_of_care: Optional[SiteOfCareExtracted] = None
    provider_requirements: list[ProviderRequirementExtracted] = []

    model_config = ConfigDict(extra="ignore")


class PolicyExtracted(BaseModel):
    payer_name: str = ""
    policy_number: Optional[str] = None
    title: Optional[str] = None
    effective_date: Optional[str] = None
    policy_type: Optional[str] = None
    drug_coverages: list[DrugCoverageExtracted] = []

    model_config = ConfigDict(extra="ignore")


# ── Ingestion API schemas ──────────────────────────────────────────────────────

class PolicyUploadResponse(BaseModel):
    policy_id: uuid.UUID
    filename: Optional[str]
    status: str
    message: str


class PipelineStage(BaseModel):
    stage: str
    status: str   # pending | running | done | error
    message: Optional[str] = None


class PipelineStatus(BaseModel):
    policy_id: uuid.UUID
    overall_status: str
    progress_pct: int
    stages: list[PipelineStage]
    error: Optional[str] = None


class PolicyListItem(BaseModel):
    id: uuid.UUID
    filename: str
    payer_name: str
    effective_date: Optional[str] = None
    status: str
    drug_count: int
    llm_provider: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CriteriaOut(BaseModel):
    id: uuid.UUID
    criterion_type: str
    description: str
    is_required: bool

    model_config = ConfigDict(from_attributes=True)


class DrugCoverageOut(BaseModel):
    id: uuid.UUID
    drug_brand_name: str
    drug_generic_name: Optional[str] = None
    coverage_status: str
    prior_auth_required: bool
    j_code: Optional[str] = None
    rxcui: Optional[str] = None
    clinical_criteria: list[CriteriaOut] = []

    model_config = ConfigDict(from_attributes=True)


class PolicyOut(BaseModel):
    id: uuid.UUID
    filename: str
    payer_name: str
    effective_date: Optional[str] = None
    status: str
    drug_coverages: list[DrugCoverageOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Query API schemas ─────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    drug_filter: Optional[str] = None
    payer_filter: Optional[str] = None
    top_k: int = 10


class SourceCitation(BaseModel):
    policy_id: uuid.UUID
    payer_name: str
    filename: str
    chunk_text: str
    page_number: Optional[int] = None
    similarity_score: float


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceCitation] = []
    structured_data: Optional[dict[str, Any]] = None
    query_type: str


class PayerComparisonRow(BaseModel):
    payer_name: str
    policy_id: uuid.UUID
    coverage_status: str
    prior_auth_required: bool
    step_therapy_steps: int
    quantity_limit: Optional[str] = None
    approved_diagnoses: list[str] = []
    j_code: Optional[str] = None
    rxcui: Optional[str] = None
    last_updated: datetime


class DrugComparisonMatrix(BaseModel):
    drug_brand_name: str
    drug_generic_name: Optional[str] = None
    rxcui: Optional[str] = None
    payer_comparisons: list[PayerComparisonRow]
