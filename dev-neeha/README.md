# AntonRX — Backend

AI-powered medical benefit drug policy ingestion, comparison, and RAG query engine.

## Architecture

```
PDF Upload
  Stage 1: pdf_parser.py       — Docling (IBM, 97.9% table accuracy) + Marker OCR fallback
  Stage 2a: nlp_extractor.py  — scispaCy NER + Med7 (7 medication entities) + regex codes
  Stage 2b: gemini_extractor.py — Gemini structured JSON (NLP-grounded, section-aware)
  Stage 3: rxnorm_client.py   — RxNorm NIH API → RxCUI, NDC, brand/generic normalization
  Stage 4: PostgreSQL          — drugs, criteria tree, step therapy, quantity limits, site-of-care
  Stage 5: chunker.py         — paragraph-aware sliding window, section-tagged chunks
  Stage 6: embedder.py        — Gemini text-embedding-004 (768-dim), batched 50/req
  Stage 7: pgvector            — HNSW index + metadata filters for hybrid retrieval
```

## Query Pipeline (RAG)

```
User Question
  → Query type detection (structured | semantic | hybrid)
  → Postgres: exact SQL on drug_coverages, criteria, step_therapy tables
  → pgvector: cosine similarity search + section-type reranking
  → Combine both into grounded Gemini prompt
  → Answer with citations
```

## Quick Start

```bash
# 1. Postgres with pgvector
docker-compose up db -d

# 2. Install
pip install -r requirements.txt

# 3. Install NLP models
python -m spacy download en_core_web_sm
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz
python -m spacy download en_core_med7_lg

# 4. Configure
cp .env.example .env   # add GEMINI_API_KEY

# 5. Run
uvicorn app.main:app --reload
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ingest/upload` | Upload PDF policy |
| GET | `/api/v1/ingest/status/{id}` | Pipeline progress |
| GET | `/api/v1/ingest/policies` | List all policies |
| GET | `/api/v1/ingest/policies/{id}` | Policy + drugs detail |
| POST | `/api/v1/query/ask` | RAG Q&A |
| GET | `/api/v1/query/compare/{drug}` | Cross-payer comparison matrix |
| GET | `/health` | Health check |

## Key Design Decisions (from research)

- **Docling over pypdf**: IBM's framework handles multi-column layouts and embedded drug/code tables with 97.9% accuracy
- **scispaCy + Med7 before Gemini**: Pre-extracted drug names and codes ground the LLM prompt, reducing hallucination
- **RxNorm normalization**: Free NIH API provides canonical RxCUI identifiers for cross-payer drug matching
- **Expanded schema**: Criteria tree with AND/OR logic, step therapy steps, site-of-care, provider requirements
- **pgvector over separate vector DB**: Single Postgres instance for both structured + vector data, simpler ops
- **Section-level change detection**: difflib SequenceMatcher + significance classification (breaking|material|minor|cosmetic)
