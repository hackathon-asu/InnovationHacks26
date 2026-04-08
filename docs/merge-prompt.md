# Merge Prompt: Combine Main (TypeScript/Next.js) + Dev (Python/FastAPI) into Best-of-Both

## Context

You are working on **InsightRX** — a Medical Benefit Drug Policy Tracker for a hackathon. There are two branches with complementary implementations that need to be merged:

- **`main` branch**: A complete Next.js 16 frontend + TypeScript backend (API routes, Drizzle ORM, AI SDK v6, pdf-parse, RxNorm client). This is the deployment target — it runs the dashboard, search, comparison matrix, chat, and all UI.
- **`dev` branch**: A Python FastAPI backend with a sophisticated 8-stage ingestion pipeline (Docling PDF parsing, scispaCy/Med7 NLP, Gemini extraction, RxNorm normalization, pgvector embeddings, hybrid RAG). The Python backend has much richer data modeling (hierarchical clinical criteria, step therapy, quantity limits, site-of-care, provider requirements) but currently can't actually run Docling because it's commented out in `requirements.txt` due to dependency conflicts on the wrong Python version.

**Goal**: Merge the Python backend into the main branch as a `backend/` subdirectory, set up a working Python 3.12 venv with Docling installed, and wire the Next.js frontend to call the FastAPI backend on `localhost:8000`. This is localhost-only for a demo video — no deployment needed.

---

## Step-by-Step Instructions

### Step 1: Prepare the merge on `dev` branch

You're currently on `dev`. First, clean up files that should never be in git:

```bash
# Remove .venv and __pycache__ from git tracking (they're committed and shouldn't be)
git rm -r --cached .venv/ __pycache__/ .next/ 2>/dev/null
```

Add these to `.gitignore` if not already present:
```
.venv/
__pycache__/
*.pyc
.next/
node_modules/
uploads/
data/
```

### Step 2: Merge main into dev

```bash
git merge main --no-edit
```

Resolve any conflicts. The key files from main to keep:
- All of `src/` (Next.js frontend and API routes)
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`
- `config/drizzle.config.ts`
- `scripts/` (seed.ts, migrate.ts, extract-policy.ts)
- `docs/` (research.md, architecture.md, etc.)
- `components.json`, `postcss.config.mjs`, `vercel.json`
- `.env.example`

The key files from dev to keep:
- All Python backend files (will be reorganized below)

### Step 3: Reorganize Python backend into `backend/` directory

Move ALL Python backend files into a `backend/` subdirectory:

```bash
mkdir -p backend/app/api/routes
mkdir -p backend/app/core
mkdir -p backend/app/db
mkdir -p backend/app/models
mkdir -p backend/app/schemas
mkdir -p backend/app/services

# Move the organized FastAPI app
mv app/api/routes/ingest.py backend/app/api/routes/
mv app/api/routes/query.py backend/app/api/routes/
mv app/api/routes/__init__.py backend/app/api/routes/
mv app/api/__init__.py backend/app/api/
mv app/core/config.py backend/app/core/
mv app/core/logging.py backend/app/core/
mv app/core/__init__.py backend/app/core/
mv app/db/session.py backend/app/db/
mv app/db/__init__.py backend/app/db/
mv app/models/policy.py backend/app/models/  # This is a re-export, see note below
mv app/models/__init__.py backend/app/models/
mv app/schemas/policy.py backend/app/schemas/
mv app/schemas/__init__.py backend/app/schemas/
mv app/services/chunker.py backend/app/services/
mv app/services/embedder.py backend/app/services/
mv app/services/nlp_extractor.py backend/app/services/  # This is a re-export
mv app/services/pdf_parser.py backend/app/services/  # This is a re-export
mv app/services/gemini_extractor.py backend/app/services/  # This is a re-export
mv app/services/ingestion_pipeline.py backend/app/services/  # This is the REAL pipeline
mv app/services/rag_query.py backend/app/services/
mv app/services/rxnorm_client.py backend/app/services/
mv app/services/__init__.py backend/app/services/
mv app/__init__.py backend/app/

# Move root-level Python files (these are the actual implementations)
mv main.py backend/
mv policy.py backend/          # SQLAlchemy models (the real ones)
mv pdf_parser.py backend/      # Docling PDF parser (the real one)
mv nlp_extractor.py backend/   # scispaCy/Med7 NLP (the real one)
mv gemini_extractor.py backend/ # Gemini structured extraction (the real one)
mv ingestion_pipeline.py backend/  # There's a copy — keep the app/services/ one
mv change_detector.py backend/
mv rxnorm_client.py backend/
mv rag_query.py backend/
mv ingest.py backend/
mv query.py backend/

# Move Python infra files
mv requirements.txt backend/
mv Dockerfile backend/
mv docker-compose.yml backend/
```

**IMPORTANT**: The files in `app/services/` like `pdf_parser.py`, `nlp_extractor.py`, `gemini_extractor.py`, and `app/models/policy.py` are just re-export stubs (1-5 lines, just `from xyz import ...`). The REAL implementations are the root-level Python files (`pdf_parser.py`, `nlp_extractor.py`, `gemini_extractor.py`, `policy.py`). After moving everything to `backend/`, you need to fix the imports so the re-export stubs point to the right locations, or (better) inline the real code into the `app/services/` files and delete the root-level duplicates.

**Recommended approach**: Replace each re-export stub in `backend/app/services/` and `backend/app/models/` with the actual implementation code from the corresponding root-level file. Then delete the root-level duplicates. This gives you a clean `backend/app/` package structure.

For example, `backend/app/services/pdf_parser.py` should contain the full ~234 lines from the root `pdf_parser.py` (the Docling parser), NOT the 6-line re-export stub.

After consolidation, fix all import paths to use relative imports within the `backend/app/` package.

### Step 4: Fix the `ingestion_pipeline.py` duplication

There are two versions:
1. `ingestion_pipeline.py` (root-level) — 242 lines, the REAL orchestrator
2. `app/services/ingestion_pipeline.py` — also 242 lines (same content, already has correct imports)

Keep `backend/app/services/ingestion_pipeline.py` (it has the correct `app.*` import paths). Delete the root-level copy.

### Step 5: Set up Python 3.12 venv with Docling

The system has Python 3.12 at `/opt/homebrew/bin/python3.12`. Docling requires Python <=3.12.

```bash
cd backend

# Create venv with Python 3.12
/opt/homebrew/bin/python3.12 -m venv .venv

# Activate
source .venv/bin/activate

# Update requirements.txt — uncomment docling, keep scispacy/med7 commented for now
```

Update `backend/requirements.txt` to:
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9

# Database
sqlalchemy==2.0.35
asyncpg==0.29.0
alembic==1.13.2
pgvector==0.3.2
psycopg2-binary==2.9.9

# Document parsing — Docling is the primary parser (97.9% table accuracy)
docling>=2.5.0
pypdf==5.4.0                # Basic fallback for when Docling fails

# Healthcare NLP (optional — graceful fallback if not installed)
# scispacy==0.5.4           # Uncomment if scipy/spacy deps resolve
# spacy==3.7.4              # Uncomment if scipy/spacy deps resolve

# AI
google-generativeai==0.8.3

# Utils
pydantic==2.9.2
pydantic-settings==2.5.2
tenacity==9.0.0
httpx==0.27.2
aiofiles==24.1.0
python-dotenv==1.0.1
structlog==24.4.0
```

Then install:
```bash
pip install -r requirements.txt
```

**Note**: Docling installation may take a few minutes as it downloads PyTorch and table structure models. If Docling fails to install, the code already has a graceful fallback to pypdf — the parser will log a warning and proceed.

After Docling installs, optionally try scispaCy:
```bash
pip install scispacy==0.5.4 spacy==3.7.4
python -m spacy download en_core_web_sm
pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz
```
If scispaCy conflicts with Docling's dependencies, leave it commented out — the NLP extractor already has graceful fallback (regex-only extraction still captures J-codes, ICD-10, CPT codes).

### Step 6: Set up PostgreSQL with pgvector

The `docker-compose.yml` already defines the database. From `backend/`:

```bash
docker-compose up -d
```

This starts PostgreSQL 16 with pgvector on port 5432. Database: `antonrx`, user: `postgres`, password: `password`.

### Step 7: Create a `.env` file in `backend/`

```bash
cat > .env << 'EOF'
GEMINI_API_KEY=<your-google-api-key>
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/antonrx
UPLOAD_DIR=uploads
ENVIRONMENT=development
EOF
```

### Step 8: Wire Next.js frontend to call FastAPI backend

The Next.js frontend currently has its own TypeScript API routes in `src/app/api/`. These need to proxy to the FastAPI backend for ingestion-related endpoints.

**Option A (Recommended for hackathon): Proxy pattern**

Update the Next.js API routes to call the FastAPI backend. Key endpoints to proxy:

| Next.js Route | FastAPI Endpoint | Purpose |
|---|---|---|
| `POST /api/policies/upload` | `POST http://localhost:8000/api/v1/ingest/upload` | PDF upload + pipeline |
| `GET /api/policies` | `GET http://localhost:8000/api/v1/ingest/policies` | List policies |
| `GET /api/policies/[id]` | `GET http://localhost:8000/api/v1/ingest/policies/{id}` | Policy detail |
| `POST /api/chat` | `POST http://localhost:8000/api/v1/query/ask` | RAG chat |
| `GET /api/compare` | `GET http://localhost:8000/api/v1/query/compare/{drug}` | Drug comparison |

For each Next.js API route, replace the Drizzle ORM queries with `fetch()` calls to the FastAPI backend:

```typescript
// Example: src/app/api/policies/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('http://localhost:8000/api/v1/ingest/policies');
  const data = await res.json();
  return NextResponse.json(data);
}
```

```typescript
// Example: src/app/api/policies/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const res = await fetch('http://localhost:8000/api/v1/ingest/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

```typescript
// Example: src/app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch('http://localhost:8000/api/v1/query/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: body.messages?.[body.messages.length - 1]?.content || body.question,
      drug_filter: body.drug_filter,
      payer_filter: body.payer_filter,
    }),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
```

**Keep** the TypeScript Drizzle schema (`src/lib/db/schema.ts`) and seed script (`scripts/seed.ts`) as reference but they won't be used at runtime — the FastAPI backend owns the database.

**Option B (Alternative): Direct browser→FastAPI**

If you prefer, the Next.js frontend can call FastAPI directly (CORS is already configured for `localhost:3000`). This avoids the proxy layer but means the frontend has two API origins.

### Step 9: Update `next.config.ts` for API proxy (if using Option A)

Alternatively, you can use Next.js rewrites to transparently proxy API calls:

```typescript
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
};
export default nextConfig;
```

This way the frontend just calls `/api/v1/ingest/policies` and Next.js proxies it to FastAPI. The existing `/api/*` Next.js routes can be kept as-is for any TypeScript-only endpoints (like `/api/stats`, `/api/openapi`).

### Step 10: Test the full stack

Terminal 1 (FastAPI):
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Terminal 2 (Next.js):
```bash
npm run dev
```

Terminal 3 (Database):
```bash
cd backend
docker-compose up -d
```

Test flow:
1. Open `http://localhost:3000` — Dashboard should load
2. Upload a PDF at `http://localhost:3000/upload` — Should hit FastAPI pipeline
3. Check `http://localhost:8000/health` — Should return `{"status": "ok"}`
4. Check `http://localhost:8000/api/v1/ingest/policies` — Should list policies
5. Try chat at `http://localhost:3000/chat` — Should use RAG query

---

## Final Directory Structure

```
InnovationHacks26/
├── backend/                    # Python FastAPI backend (friend's code)
│   ├── app/
│   │   ├── api/routes/         # ingest.py, query.py
│   │   ├── core/               # config.py, logging.py
│   │   ├── db/                 # session.py (async SQLAlchemy)
│   │   ├── models/             # policy.py (SQLAlchemy ORM models)
│   │   ├── schemas/            # policy.py (Pydantic request/response)
│   │   └── services/           # pdf_parser, nlp_extractor, gemini_extractor,
│   │                           # ingestion_pipeline, chunker, embedder,
│   │                           # rag_query, rxnorm_client
│   ├── change_detector.py
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt        # With docling uncommented
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env                    # GEMINI_API_KEY, DATABASE_URL
│   └── .venv/                  # Python 3.12 venv (gitignored)
│
├── src/                        # Next.js frontend (your code from main)
│   ├── app/
│   │   ├── api/                # Proxy routes → FastAPI
│   │   ├── page.tsx            # Dashboard
│   │   ├── policies/           # Policy pages
│   │   ├── drugs/              # Drug search/coverage
│   │   ├── compare/            # Comparison matrix
│   │   ├── chat/               # RAG chat
│   │   ├── changes/            # Policy changes timeline
│   │   └── upload/             # PDF upload
│   ├── components/             # React components (shadcn/ui)
│   ├── hooks/                  # Custom hooks
│   └── lib/                    # TypeScript utilities (keep for reference)
│
├── docs/                       # Architecture, research
├── scripts/                    # TypeScript seed/migrate scripts (reference)
├── config/                     # Drizzle config (reference)
├── package.json
├── next.config.ts
├── tsconfig.json
└── .gitignore
```

---

## Key Technical Details

### The Python backend's database schema (in `policy.py`, ~295 lines)

Uses SQLAlchemy 2.0 async with these tables:
- **payers**: UUID pk, name, plan_types (ARRAY), metadata (JSONB)
- **policies**: UUID pk, payer_id FK, filename, payer_name, policy_number, title, effective_date, policy_type, status (pipeline stage), page_count, file_hash, error_message, created_at
- **policy_versions**: UUID pk, policy_id FK, version_number, diff_json (JSONB), change_summary, significance
- **drug_coverages**: UUID pk, policy_id FK, drug names, rxcui, j_code, ndc_codes (ARRAY), coverage_status, prior_auth, drug_class, indication, raw_extracted (JSONB)
- **clinical_criteria**: UUID pk, drug_coverage_id FK, parent_id FK (self-referencing tree), criterion_type, logic_operator (AND/OR/NOT), description, is_required
- **criteria_icd_codes**: UUID pk, criterion_id FK, icd10_code, code_range_start/end
- **step_therapy**: UUID pk, drug_coverage_id FK, step_number, drug_or_class, min_duration, min_dose, failure_definition, contraindication_bypass, sort_order
- **quantity_limits**: UUID pk, drug_coverage_id FK, quantity, unit, period, max_daily_dose, notes
- **site_of_care**: UUID pk, drug_coverage_id FK, preferred_site, allowed_sites (ARRAY), restricted_sites (ARRAY), exception_criteria
- **provider_requirements**: UUID pk, drug_coverage_id FK, required_specialty, prescriber_type, consultation_required, notes
- **document_chunks**: UUID pk, policy_id FK, chunk_index, chunk_text, page_number, section_type, embedding (Vector 768), token_count, chunk_metadata (JSONB)
- **audit_log**: UUID pk, policy_id FK, event_type, file_hash, diff_summary, significance, entry_hash

### The ingestion pipeline stages (8 stages)

1. **Parse** (`pdf_parser.py`): Docling primary → Marker OCR fallback → pypdf last resort. Section detection via regex. Returns ParsedDocument with per-page text, section types, raw Markdown, metadata (effective_date, policy_number from first page).

2. **NLP Extract** (`nlp_extractor.py`): Regex for J-codes, ICD-10, CPT codes. Optional scispaCy NER for drug names. Optional Med7 for medication entities (drug+dosage+route+strength). Returns MedNLPResult with drug_names, medical_codes, icd10_codes, hcpcs_codes, quantity_hints.

3. **Gemini Extract** (`gemini_extractor.py`): Takes raw policy text + NLP hints → Gemini 2.5 Flash with temperature=0.0 → returns PolicyExtracted (Pydantic model with nested drug coverages, clinical criteria trees, step therapy, quantity limits, site-of-care, provider requirements). Handles long policies by splitting into sections and merging results. Has retry logic (3 attempts with exponential backoff).

4. **RxNorm** (`rxnorm_client.py`): NIH RxNav API for drug normalization. Gets RxCUI, generic names, NDC codes. Rate-limited (10 concurrent, 3 retries).

5. **Save to PostgreSQL**: Recursive clinical criteria tree insertion, step therapy, quantity limits, site-of-care, provider requirements, audit log entry.

6. **Chunk** (`chunker.py`): Paragraph-aware sliding window. 800 token chunks, 100 token overlap. Preserves page number and section type metadata.

7. **Embed** (`embedder.py`): Gemini text-embedding-004, 768 dimensions. Batches 50 per request. Runs in executor thread pool.

8. **Index**: Stores embeddings in pgvector DocumentChunk table with metadata for filtering.

### The CORS config in FastAPI (`main.py`)

Already allows `http://localhost:3000` (Next.js dev server).

### The Gemini API key

Both the Python backend and the TypeScript frontend use the same Gemini API key. The Python backend reads it from `backend/.env` as `GEMINI_API_KEY`. The Next.js frontend reads it from root `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY` (AI SDK convention).

### What NOT to change

- Do NOT modify the Python backend's core logic (extraction, pipeline, RAG, etc.)
- Do NOT delete the TypeScript `src/lib/` modules — keep as reference
- Do NOT change the database schema in `policy.py`
- Do NOT remove any frontend components or pages
- Do NOT change any `.claude/`, `.agents/`, or skill-related files

### What to verify after merge

1. `cd backend && source .venv/bin/activate && python -c "from docling.document_converter import DocumentConverter; print('Docling OK')"` — Docling imports successfully
2. `cd backend && uvicorn main:app --port 8000` — FastAPI starts without errors
3. `npm run dev` — Next.js starts without errors
4. `curl http://localhost:8000/health` — Returns `{"status": "ok"}`

---

## Research Alignment

This merged architecture follows the research document (`docs/research.md`) exactly:

| Research Recommendation | Implementation |
|---|---|
| Docling primary + Marker fallback (§1.1) | `pdf_parser.py` with 3-tier fallback |
| scispaCy + Med7 NER before LLM (§2.3) | `nlp_extractor.py` feeds hints to Gemini |
| LLM structured output with Zod/Pydantic (§4.1) | `gemini_extractor.py` with PolicyExtracted schema |
| RxNorm for drug normalization (§3.1) | `rxnorm_client.py` using RxNav API |
| PostgreSQL + pgvector (§7.1) | SQLAlchemy + pgvector extension |
| Clinical criteria as tree structure (§5.1) | `clinical_criteria` table with parent_id self-ref |
| Section-by-section processing (§4.2) | `_split_into_sections()` in gemini_extractor |
| Hybrid RAG (SQL + vector) (§7.3) | `rag_query.py` with structured + semantic search |
| Change detection with significance (§6.3) | `change_detector.py` with breaking/material/minor/cosmetic |
| Comparison matrix (§7.2) | `/api/v1/query/compare/{drug}` endpoint |
