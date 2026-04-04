"""
SQLAlchemy models — upgraded per research guide.

Tables:
  payers                 — health plan / insurance company
  policies               — one document per row, with version tracking
  policy_versions        — immutable history of every policy change
  drug_coverages         — coverage determination per drug per policy
  clinical_criteria      — tree-structured PA criteria (AND/OR/NOT logic)
  criteria_icd_codes     — ICD-10 codes attached to a criterion
  step_therapy           — ordered step therapy requirements
  quantity_limits        — quantity/duration limits per drug coverage
  site_of_care           — site restrictions per drug coverage
  provider_requirements  — specialty/prescriber requirements
  document_chunks        — PubMedBERT-dimensioned vectors for RAG
  audit_log              — immutable hash log (Solana anchoring later)
"""

import uuid
from datetime import datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY, Boolean, DateTime, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.core.config import get_settings

settings = get_settings()
EMBED_DIM = settings.embedding_dimensions   # 768 for PubMedBERT / Gemini text-embedding-004


# ── Payer ────────────────────────────────────────────────────────────────────

class Payer(Base):
    __tablename__ = "payers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    plan_types: Mapped[Optional[list]] = mapped_column(ARRAY(String))   # ["Commercial", "Medicare"]
    website_url: Mapped[Optional[str]] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policies: Mapped[list["Policy"]] = relationship("Policy", back_populates="payer")


# ── Policy document ───────────────────────────────────────────────────────────

class Policy(Base):
    __tablename__ = "policies"
    __table_args__ = (
        UniqueConstraint("payer_id", "policy_number", "effective_date", name="uq_policy_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("payers.id"))
    payer_name: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    policy_number: Mapped[Optional[str]] = mapped_column(String(64))
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(Text)
    effective_date: Mapped[Optional[str]] = mapped_column(String(32))
    last_reviewed: Mapped[Optional[str]] = mapped_column(String(32))
    policy_type: Mapped[Optional[str]] = mapped_column(String(128))  # oncology, rheumatology…
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    original_file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    raw_text_path: Mapped[Optional[str]] = mapped_column(String(512))
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    page_count: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    # pending|parsing|extracting|normalizing|saving_structured|chunking|embedding|indexing|indexed|failed
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    payer: Mapped[Optional["Payer"]] = relationship("Payer", back_populates="policies")
    versions: Mapped[list["PolicyVersion"]] = relationship("PolicyVersion", back_populates="policy", cascade="all, delete-orphan")
    drug_coverages: Mapped[list["DrugCoverage"]] = relationship("DrugCoverage", back_populates="policy", cascade="all, delete-orphan")
    chunks: Mapped[list["DocumentChunk"]] = relationship("DocumentChunk", back_populates="policy", cascade="all, delete-orphan")
    audit_entries: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="policy", cascade="all, delete-orphan")


class PolicyVersion(Base):
    """Immutable snapshot of every version of a policy document."""
    __tablename__ = "policy_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"))
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    effective_date: Mapped[Optional[str]] = mapped_column(String(32))
    change_summary: Mapped[Optional[str]] = mapped_column(Text)   # LLM-generated
    diff_json: Mapped[Optional[dict]] = mapped_column(JSONB)       # structured diff from prev version
    significance: Mapped[Optional[str]] = mapped_column(String(32))  # breaking|material|minor|cosmetic
    source_document_hash: Mapped[str] = mapped_column(String(64))
    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policy: Mapped["Policy"] = relationship("Policy", back_populates="versions")


# ── Drug coverage ─────────────────────────────────────────────────────────────

class DrugCoverage(Base):
    """Coverage determination for one drug within one policy."""
    __tablename__ = "drug_coverages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"))

    # Drug identity — normalized via RxNorm API
    drug_brand_name: Mapped[str] = mapped_column(String(256), nullable=False)
    drug_generic_name: Mapped[Optional[str]] = mapped_column(String(256))
    drug_class: Mapped[Optional[str]] = mapped_column(String(128))
    indication: Mapped[Optional[str]] = mapped_column(Text)
    rxcui: Mapped[Optional[str]] = mapped_column(String(32))       # RxNorm concept ID (from NIH API)
    j_code: Mapped[Optional[str]] = mapped_column(String(16))      # HCPCS J-code e.g. J9271
    ndc_codes: Mapped[Optional[list]] = mapped_column(ARRAY(String))

    # Coverage determination
    coverage_status: Mapped[str] = mapped_column(String(32), default="covered_with_criteria")
    # covered | not_covered | covered_with_criteria | experimental | not_addressed
    prior_auth_required: Mapped[bool] = mapped_column(Boolean, default=False)
    plan_types: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    raw_extracted: Mapped[Optional[dict]] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policy: Mapped["Policy"] = relationship("Policy", back_populates="drug_coverages")
    clinical_criteria: Mapped[list["ClinicalCriterion"]] = relationship(
        "ClinicalCriterion", back_populates="drug_coverage",
        cascade="all, delete-orphan",
        primaryjoin="and_(ClinicalCriterion.drug_coverage_id == DrugCoverage.id, ClinicalCriterion.parent_id == None)"
    )
    step_therapy: Mapped[list["StepTherapy"]] = relationship("StepTherapy", back_populates="drug_coverage", cascade="all, delete-orphan")
    quantity_limits: Mapped[list["QuantityLimit"]] = relationship("QuantityLimit", back_populates="drug_coverage", cascade="all, delete-orphan")
    site_of_care: Mapped[Optional["SiteOfCare"]] = relationship("SiteOfCare", back_populates="drug_coverage", uselist=False, cascade="all, delete-orphan")
    provider_requirements: Mapped[list["ProviderRequirement"]] = relationship("ProviderRequirement", back_populates="drug_coverage", cascade="all, delete-orphan")


# ── Clinical criteria tree ────────────────────────────────────────────────────

class ClinicalCriterion(Base):
    """
    Tree-structured criteria with AND/OR/NOT logic.
    Top-level criteria have parent_id=None.
    Children inherit from parent via adjacency list.
    """
    __tablename__ = "clinical_criteria"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_coverage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drug_coverages.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clinical_criteria.id"))

    criterion_type: Mapped[str] = mapped_column(String(64))
    # diagnosis | step_therapy | lab_result | age | gender | provider_specialty |
    # site_of_care | quantity_limit | duration_limit | documentation | comorbidity |
    # contraindication | other
    logic_operator: Mapped[Optional[str]] = mapped_column(String(8))  # AND | OR | NOT
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    drug_coverage: Mapped["DrugCoverage"] = relationship(
        "DrugCoverage", back_populates="clinical_criteria",
        foreign_keys=[drug_coverage_id]
    )
    children: Mapped[list["ClinicalCriterion"]] = relationship(
        "ClinicalCriterion", back_populates="parent"
    )
    parent: Mapped[Optional["ClinicalCriterion"]] = relationship(
        "ClinicalCriterion", back_populates="children", remote_side="ClinicalCriterion.id"
    )
    icd_codes: Mapped[list["CriterionIcdCode"]] = relationship("CriterionIcdCode", back_populates="criterion", cascade="all, delete-orphan")


class CriterionIcdCode(Base):
    __tablename__ = "criteria_icd_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    criterion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clinical_criteria.id", ondelete="CASCADE"))
    icd10_code: Mapped[str] = mapped_column(String(16), nullable=False)  # e.g. M06.9
    icd10_description: Mapped[Optional[str]] = mapped_column(Text)
    code_range_start: Mapped[Optional[str]] = mapped_column(String(16))  # for ranges like C50.0
    code_range_end: Mapped[Optional[str]] = mapped_column(String(16))

    criterion: Mapped["ClinicalCriterion"] = relationship("ClinicalCriterion", back_populates="icd_codes")


# ── Step therapy ──────────────────────────────────────────────────────────────

class StepTherapy(Base):
    __tablename__ = "step_therapy"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_coverage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drug_coverages.id", ondelete="CASCADE"))
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    drug_or_class: Mapped[str] = mapped_column(Text, nullable=False)   # "methotrexate" or "conventional DMARD"
    min_duration: Mapped[Optional[str]] = mapped_column(String(64))    # "90 days"
    min_dose: Mapped[Optional[str]] = mapped_column(String(64))        # "15mg/week"
    failure_definition: Mapped[Optional[str]] = mapped_column(Text)
    contraindication_bypass: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    drug_coverage: Mapped["DrugCoverage"] = relationship("DrugCoverage", back_populates="step_therapy")


# ── Quantity limits ───────────────────────────────────────────────────────────

class QuantityLimit(Base):
    __tablename__ = "quantity_limits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_coverage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drug_coverages.id", ondelete="CASCADE"))
    quantity: Mapped[float] = mapped_column(Numeric, nullable=False)
    unit: Mapped[str] = mapped_column(String(64), nullable=False)     # "vials", "tablets", "mg"
    period: Mapped[str] = mapped_column(String(64), nullable=False)   # "28 days", "month"
    max_daily_dose: Mapped[Optional[str]] = mapped_column(String(64))
    notes: Mapped[Optional[str]] = mapped_column(Text)

    drug_coverage: Mapped["DrugCoverage"] = relationship("DrugCoverage", back_populates="quantity_limits")


# ── Site of care ──────────────────────────────────────────────────────────────

class SiteOfCare(Base):
    __tablename__ = "site_of_care"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_coverage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drug_coverages.id", ondelete="CASCADE"), unique=True)
    preferred_site: Mapped[Optional[str]] = mapped_column(String(128))
    allowed_sites: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    restricted_sites: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    exception_criteria: Mapped[Optional[str]] = mapped_column(Text)

    drug_coverage: Mapped["DrugCoverage"] = relationship("DrugCoverage", back_populates="site_of_care")


# ── Provider requirements ─────────────────────────────────────────────────────

class ProviderRequirement(Base):
    __tablename__ = "provider_requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_coverage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("drug_coverages.id", ondelete="CASCADE"))
    required_specialty: Mapped[Optional[str]] = mapped_column(String(128))  # "oncology"
    prescriber_type: Mapped[Optional[str]] = mapped_column(String(64))      # "physician", "NP"
    consultation_required: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    drug_coverage: Mapped["DrugCoverage"] = relationship("DrugCoverage", back_populates="provider_requirements")


# ── Vector chunks for RAG ─────────────────────────────────────────────────────

class DocumentChunk(Base):
    """One row per text chunk. PubMedBERT/Gemini 768-dim embeddings."""
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    section_type: Mapped[Optional[str]] = mapped_column(String(64))  # criteria|codes|background|step_therapy
    section_title: Mapped[Optional[str]] = mapped_column(String(256))
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBED_DIM))
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, name="metadata")  # payer_name, drug_name, etc. for filtered search
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policy: Mapped["Policy"] = relationship("Policy", back_populates="chunks")


# ── Audit log ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    """Immutable log of every policy change. Hashes will anchor to Solana."""
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(64))      # created|updated|deleted
    file_hash: Mapped[str] = mapped_column(String(64))
    diff_summary: Mapped[Optional[str]] = mapped_column(Text)
    significance: Mapped[Optional[str]] = mapped_column(String(32))  # breaking|material|minor|cosmetic
    solana_tx_hash: Mapped[Optional[str]] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policy: Mapped["Policy"] = relationship("Policy", back_populates="audit_entries")
