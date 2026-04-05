# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
POST /api/v1/query/ask          — RAG Q&A endpoint
GET  /api/v1/query/compare/{drug} — cross-payer comparison matrix
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.policy import DrugCoverage, Policy, StepTherapy
from app.schemas.policy import (
    DrugComparisonMatrix, PayerComparisonRow, QueryRequest, QueryResponse
)
from app.services.rag_query import answer_query
from app.core.logging import get_logger
from datetime import datetime

router = APIRouter(prefix="/query", tags=["query"])
log = get_logger(__name__)


@router.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Hybrid RAG endpoint — answers natural language questions about drug policies.

    Examples:
      "Which plans cover pembrolizumab for NSCLC?"
      "What prior auth criteria does Cigna require for Humira?"
      "What changed across payer policies for adalimumab this quarter?"
    """
    try:
        return await answer_query(db, request)
    except Exception as e:
        log.error("Query failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/compare/{drug_name}", response_model=DrugComparisonMatrix)
async def compare_drug_across_payers(drug_name: str, db: AsyncSession = Depends(get_db)):
    """
    Cross-payer comparison matrix for a single drug.
    Returns a structured table: one row per payer with coverage details.

    Example: GET /api/v1/query/compare/pembrolizumab
    """
    drug_lower = drug_name.lower()

    result = await db.execute(
        select(
            Policy.payer_name,
            Policy.id.label("policy_id"),
            Policy.updated_at,
            DrugCoverage.id.label("coverage_id"),
            DrugCoverage.drug_brand_name,
            DrugCoverage.drug_generic_name,
            DrugCoverage.rxcui,
            DrugCoverage.j_code,
            DrugCoverage.coverage_status,
            DrugCoverage.prior_auth_required,
        )
        .join(DrugCoverage, DrugCoverage.policy_id == Policy.id)
        .where(Policy.status == "indexed")
        .where(
            func.lower(DrugCoverage.drug_brand_name).contains(drug_lower) |
            func.lower(DrugCoverage.drug_generic_name).contains(drug_lower)
        )
        .order_by(Policy.payer_name)
    )
    rows = result.mappings().all()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No coverage data found for drug: {drug_name}")

    payer_rows = []
    for row in rows:
        # Step therapy count
        step_count = await db.scalar(
            select(func.count(StepTherapy.id))
            .where(StepTherapy.drug_coverage_id == row["coverage_id"])
        ) or 0

        # Get ICD-10 codes from criteria
        from app.models.policy import ClinicalCriterion, CriterionIcdCode
        icd_result = await db.execute(
            select(CriterionIcdCode.icd10_code)
            .join(ClinicalCriterion, CriterionIcdCode.criterion_id == ClinicalCriterion.id)
            .where(ClinicalCriterion.drug_coverage_id == row["coverage_id"])
            .limit(10)
        )
        icd_codes = [r[0] for r in icd_result.all()]

        payer_rows.append(PayerComparisonRow(
            payer_name=row["payer_name"],
            policy_id=row["policy_id"],
            coverage_status=row["coverage_status"],
            prior_auth_required=row["prior_auth_required"],
            step_therapy_steps=step_count,
            quantity_limit=None,   # TODO: join quantity_limits
            approved_diagnoses=icd_codes,
            j_code=row["j_code"],
            rxcui=row["rxcui"],
            last_updated=row["updated_at"] or datetime.utcnow(),
        ))

    # Use first row for drug identity
    first = rows[0]
    return DrugComparisonMatrix(
        drug_brand_name=first["drug_brand_name"],
        drug_generic_name=first["drug_generic_name"],
        rxcui=first["rxcui"],
        payer_comparisons=payer_rows,
    )
