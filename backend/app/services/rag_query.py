# --------0x0x0x0x0x0-----------
# AntonRX - AI Policy Tracker
# Written by Abhinav & Neeharika
# CC BY-NC-SA 4.0
# Commercial use: chatgpt@asu.edu
# --------------------------------
"""
RAG Query Engine — the answering pipeline.

RAG is NOT a database. It is a process:
  1. Retrieve   → structured Postgres query + semantic pgvector search
  2. Rerank     → cross-encoder reranking for precision (research recommendation)
  3. Augment    → combine results into a grounded Gemini prompt
  4. Generate   → Gemini produces final answer with citations

Query types (auto-detected):
  structured  → "Which plans cover Drug X?" → SQL on drug_coverages table
  semantic    → "What is the step therapy logic for pembrolizumab?" → vector search
  hybrid      → "Does Aetna cover Keytruda for NSCLC without step therapy?" → both
"""

import re
import uuid
from typing import Optional

import httpx
import google.generativeai as genai
from sqlalchemy import select, and_, func, text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.policy import DocumentChunk, DrugCoverage, Policy, StepTherapy, ClinicalCriterion
from app.schemas.policy import QueryRequest, QueryResponse, SourceCitation
from app.services.embedder import embed_query

settings = get_settings()
log = get_logger(__name__)

genai.configure(api_key=settings.gemini_api_key)

# Known drug brand/generic name fragments for extraction
_DRUG_PATTERN = re.compile(
    r'\b(humira|adalimumab|rituxan|rituximab|keytruda|pembrolizumab|opdivo|nivolumab|'
    r'avastin|bevacizumab|herceptin|trastuzumab|enbrel|etanercept|remicade|infliximab|'
    r'stelara|ustekinumab|skyrizi|risankizumab|tremfya|guselkumab|cosentyx|secukinumab|'
    r'dupixent|dupilumab|rinvoq|upadacitinib|xeljanz|tofacitinib|ocrevus|ocrelizumab|'
    r'tysabri|natalizumab|lemtrada|alemtuzumab|zinbryta|daclizumab|kesimpta|ofatumumab|'
    r'briumvi|ublituximab|leqembi|lecanemab|zolgensma|onasemnogene|spinraza|nusinersen|'
    r'benlysta|belimumab|xolair|omalizumab|entyvio|vedolizumab|cimzia|certolizumab|'
    r'adakveo|crizanlizumab|prolia|denosumab|xgeva|botox|dysport|xeomin|myobloc|'
    r'wegovy|ozempic|semaglutide|mounjaro|zepbound|tirzepatide|saxenda|liraglutide|'
    r'skytrofa|lonapegsomatropin|amondys|casimersen|tepezza|teprotumumab|'
    r'kisqali|ibrance|lynparza|imbruvica|tagrisso|xtandi|venclexta|brukinsa|'
    r'emgality|aimovig|ajovy|qulipta|ubrelvy|nurtec|'
    r'mavyret|epclusa|harvoni|sovaldi|'
    r'actemra|tocilizumab|orencia|abatacept|simponi|golimumab)\b',
    re.IGNORECASE
)

ANSWER_SYSTEM_PROMPT = """
You are a medical benefit drug policy analyst. You answer questions about insurance coverage
for medical benefit drugs by analyzing policy documents.

You will receive:
  1. The user's question
  2. Structured data from the policy database (exact facts)
  3. Relevant text chunks from policy documents (semantic context)

Answer rules:
  - Ground every claim in the provided context — never speculate or use outside knowledge.
  - Be precise: quote specific criteria, step therapy requirements, and code numbers.
  - When comparing across payers, present a clear structured comparison.
  - Always cite the source policy and payer for each fact.
  - If the context is insufficient to answer, say so clearly.
  - Format your answer in plain text with clear sections. No markdown headers.
""".strip()


def _detect_query_type(question: str) -> str:
    """
    Heuristic classification of query type to determine retrieval strategy.
    structured  → exact filter queries (coverage status, PA required, etc.)
    semantic    → nuanced questions about criteria text
    hybrid      → questions mixing structured facts with semantic context
    """
    question_lower = question.lower()

    structured_signals = [
        "which plans", "which payers", "does .+ cover", "is .+ covered",
        "prior auth", "list all", "how many payers",
    ]
    semantic_signals = [
        "what are the criteria", "what does the policy say", "explain",
        "step therapy", "clinical criteria", "why", "how does"
    ]

    structured_score = sum(1 for p in structured_signals if re.search(p, question_lower))
    semantic_score = sum(1 for p in semantic_signals if re.search(p, question_lower))

    if structured_score > semantic_score:
        return "structured"
    elif semantic_score > structured_score:
        return "semantic"
    return "hybrid"


async def _structured_lookup(
    db: AsyncSession,
    question: str,
    drug_filter: Optional[str],
    payer_filter: Optional[str],
) -> list[dict]:
    """
    Query PostgreSQL for exact structured facts.
    Returns list of coverage records matching the filters.
    """
    filters = []

    if drug_filter:
        drug_lower = drug_filter.lower()
        filters.append(
            (func.lower(DrugCoverage.drug_brand_name).contains(drug_lower)) |
            (func.lower(DrugCoverage.drug_generic_name).contains(drug_lower))
        )

    if payer_filter:
        filters.append(func.lower(Policy.payer_name).contains(payer_filter.lower()))

    query = (
        select(
            Policy.payer_name,
            Policy.id.label("policy_id"),
            Policy.filename,
            Policy.effective_date,
            DrugCoverage.drug_brand_name,
            DrugCoverage.drug_generic_name,
            DrugCoverage.coverage_status,
            DrugCoverage.prior_auth_required,
            DrugCoverage.j_code,
            DrugCoverage.rxcui,
        )
        .join(DrugCoverage, DrugCoverage.policy_id == Policy.id)
        .where(and_(*filters) if filters else text("1=1"))
        .where(Policy.status == "indexed")
        .order_by(Policy.payer_name)
        .limit(50)
    )

    result = await db.execute(query)
    rows = result.mappings().all()

    records = []
    for row in rows:
        # Fetch step therapy count
        step_count = await db.scalar(
            select(func.count(StepTherapy.id))
            .join(DrugCoverage, StepTherapy.drug_coverage_id == DrugCoverage.id)
            .where(
                DrugCoverage.policy_id == row["policy_id"],
                func.lower(DrugCoverage.drug_brand_name).contains(
                    (drug_filter or "").lower()
                )
            )
        )
        records.append({
            "payer_name": row["payer_name"],
            "policy_id": str(row["policy_id"]),
            "filename": row["filename"],
            "drug_brand_name": row["drug_brand_name"],
            "drug_generic_name": row["drug_generic_name"],
            "coverage_status": row["coverage_status"],
            "prior_auth_required": row["prior_auth_required"],
            "j_code": row["j_code"],
            "rxcui": row["rxcui"],
            "step_therapy_steps": step_count or 0,
            "effective_date": row["effective_date"],
        })

    return records


def _extract_drug_from_question(question: str) -> Optional[str]:
    """Extract a drug name from the question text using regex."""
    match = _DRUG_PATTERN.search(question)
    return match.group(0) if match else None


async def _broad_structured_lookup(db: AsyncSession, question: str) -> list[dict]:
    """Fallback: return a sample of indexed drugs when no specific drug is mentioned."""
    result = await db.execute(
        select(
            Policy.payer_name,
            Policy.id.label("policy_id"),
            Policy.filename,
            Policy.effective_date,
            DrugCoverage.drug_brand_name,
            DrugCoverage.drug_generic_name,
            DrugCoverage.coverage_status,
            DrugCoverage.prior_auth_required,
            DrugCoverage.j_code,
            DrugCoverage.rxcui,
        )
        .join(DrugCoverage, DrugCoverage.policy_id == Policy.id)
        .where(Policy.status == "indexed")
        .order_by(Policy.payer_name)
        .limit(20)
    )
    rows = result.mappings().all()
    return [
        {
            "payer_name": row["payer_name"],
            "policy_id": str(row["policy_id"]),
            "filename": row["filename"],
            "drug_brand_name": row["drug_brand_name"],
            "drug_generic_name": row["drug_generic_name"],
            "coverage_status": row["coverage_status"],
            "prior_auth_required": row["prior_auth_required"],
            "j_code": row["j_code"],
            "rxcui": row["rxcui"],
            "step_therapy_steps": 0,
            "effective_date": row["effective_date"],
        }
        for row in rows
    ]


async def _vector_search(
    db: AsyncSession,
    question: str,
    payer_filter: Optional[str],
    top_k: int,
) -> list[tuple[DocumentChunk, float]]:
    """
    pgvector ANN search — returns (chunk, similarity_score) pairs.
    Optionally filters by payer metadata.

    Uses cosine similarity. pgvector operator: <=> for cosine distance.
    similarity = 1 - distance (higher = more relevant).
    """
    query_embedding = await embed_query(question)
    vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    # Use raw SQL to avoid pgvector/SQLAlchemy bind parameter issues
    payer_clause = ""
    params: dict = {"limit": top_k * 2}
    if payer_filter:
        payer_clause = "AND LOWER(p.payer_name) LIKE :payer_pattern"
        params["payer_pattern"] = f"%{payer_filter.lower()}%"

    raw_sql = text(f"""
        SELECT dc.*, 1 - (dc.embedding <=> '{vec_str}'::vector) AS similarity
        FROM document_chunks dc
        JOIN policies p ON dc.policy_id = p.id
        WHERE p.status = 'indexed' {payer_clause}
        ORDER BY dc.embedding <=> '{vec_str}'::vector
        LIMIT :limit
    """)

    result = await db.execute(raw_sql, params)
    raw_rows = result.mappings().all()

    # Convert raw rows to (DocumentChunk-like, similarity) pairs
    rows = []
    for row in raw_rows:
        chunk = await db.get(DocumentChunk, row["id"])
        if chunk:
            rows.append((chunk, float(row["similarity"])))

    # Simple reranking: boost chunks from "criteria" sections (more precise)
    reranked = sorted(
        rows,
        key=lambda r: (
            r[1] + (0.05 if r[0].section_type in ("clinical_criteria", "step_therapy", "prior_auth") else 0)
        ),
        reverse=True
    )

    return reranked[:top_k]


def _format_structured_context(records: list[dict]) -> str:
    if not records:
        return "No structured coverage data found for this query."

    lines = ["=== STRUCTURED DATABASE RESULTS ==="]
    for r in records:
        lines.append(
            f"Payer: {r['payer_name']} | Drug: {r['drug_brand_name']} "
            f"({r.get('drug_generic_name', 'N/A')}) | "
            f"Status: {r['coverage_status']} | PA Required: {r['prior_auth_required']} | "
            f"Step Therapy Steps: {r['step_therapy_steps']} | J-Code: {r.get('j_code', 'N/A')} | "
            f"RxCUI: {r.get('rxcui', 'N/A')} | Effective: {r.get('effective_date', 'N/A')}"
        )
    return "\n".join(lines)


def _format_chunk_context(chunks_with_scores: list[tuple[DocumentChunk, float]]) -> str:
    if not chunks_with_scores:
        return "No relevant policy text found."

    lines = ["=== RELEVANT POLICY TEXT (semantic search) ==="]
    for chunk, score in chunks_with_scores:
        lines.append(
            f"[Score: {score:.3f} | Section: {chunk.section_type or 'general'} "
            f"| Page: {chunk.page_number or '?'}]\n{chunk.chunk_text}\n"
        )
    return "\n".join(lines)


async def answer_query(
    db: AsyncSession,
    request: QueryRequest,
    provider: Optional[str] = None,
) -> QueryResponse:
    """
    Main entry point for the RAG query pipeline.
    Detects query type, retrieves from both Postgres and pgvector, generates answer.
    """
    query_type = _detect_query_type(request.question)
    effective_provider = provider or settings.llm_provider
    log.info("Processing query", type=query_type, provider=effective_provider, question=request.question[:80])

    # Auto-extract drug filter from question if not provided
    drug_filter = request.drug_filter or _extract_drug_from_question(request.question)

    # ── Retrieve ─────────────────────────────────────────────────────────────
    structured_records: list[dict] = []
    chunk_results: list[tuple[DocumentChunk, float]] = []

    if query_type in ("structured", "hybrid"):
        structured_records = await _structured_lookup(
            db, request.question, drug_filter, request.payer_filter
        )
        # Fallback: if no results and no specific drug, show available data
        if not structured_records and not drug_filter:
            structured_records = await _broad_structured_lookup(db, request.question)

    if query_type in ("semantic", "hybrid"):
        try:
            chunk_results = await _vector_search(
                db, request.question, request.payer_filter, request.top_k
            )
        except Exception as e:
            log.warning("Vector search unavailable, using structured data only", error=str(e))

    # ── Augment prompt ────────────────────────────────────────────────────────
    context_block = "\n\n".join([
        _format_structured_context(structured_records),
        _format_chunk_context(chunk_results),
    ])

    prompt = f"""Question: {request.question}

{context_block}

Answer the question based strictly on the context above."""

    # ── Generate ──────────────────────────────────────────────────────────────
    if effective_provider == "ollama":
        async with httpx.AsyncClient(timeout=120.0) as client:
            ollama_response = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.1},
                },
            )
            ollama_response.raise_for_status()
            answer_text = ollama_response.json()["message"]["content"].strip()
    else:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=ANSWER_SYSTEM_PROMPT,
        )
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4096,
            ),
        )
        answer_text = response.text.strip()

    # Build source citations from vector chunks
    sources = []
    for chunk, score in chunk_results:
        # Fetch policy info for the citation
        policy_result = await db.execute(
            select(Policy).where(Policy.id == chunk.policy_id)
        )
        policy = policy_result.scalar_one_or_none()
        if policy:
            sources.append(SourceCitation(
                policy_id=chunk.policy_id,
                payer_name=policy.payer_name,
                filename=policy.filename,
                chunk_text=chunk.chunk_text[:300] + "..." if len(chunk.chunk_text) > 300 else chunk.chunk_text,
                page_number=chunk.page_number,
                similarity_score=score,
            ))

    log.info("Query answered",
             type=query_type,
             structured_records=len(structured_records),
             chunks=len(chunk_results))

    return QueryResponse(
        answer=answer_text,
        sources=sources,
        structured_data={"records": structured_records} if structured_records else None,
        query_type=query_type,
    )
