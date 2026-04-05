# AntonRX

> AI-powered medical benefit drug policy intelligence.
>
> Upload payer PDFs, extract coverage rules, compare plans side-by-side, and ask grounded questions with citations.

<p align="center">
  <strong>Next.js 16</strong> • <strong>FastAPI</strong> • <strong>PostgreSQL + pgvector</strong> • <strong>Docling</strong> • <strong>RxNorm</strong> • <strong>Hybrid RAG</strong>
</p>

AntonRX is a full-stack policy intelligence workspace built for fast-moving healthcare teams that need to understand medical benefit drug policies without manually digging through payer PDFs. The app combines a polished Next.js dashboard with a FastAPI ingestion/query backend that parses policies, normalizes drug identities, indexes chunks for retrieval, and serves comparison and Q&A workflows.

Built for Innovation Hacks 2.0 at ASU, the project is tuned for one job: turning messy policy documents into something you can actually work with.

## Why It Hits

- Upload PDFs or auto-fetch policy files from supported payer sources.
- Run an 8-stage ingestion pipeline from parsing through pgvector indexing.
- Normalize drug names and codes with RxNorm so cross-payer comparisons are less messy.
- Compare coverage, prior auth, and step therapy requirements across plans.
- Ask natural-language questions against indexed policy content with cited answers.
- Switch between multiple provider paths: Gemini, Anthropic, Groq, NVIDIA, or local Ollama.
- Explore a unified UI with dashboard, uploads, compare, fetch, change tracking, chat, and API docs.

## Core Workflow

```mermaid
flowchart LR
    A["Upload PDF or Auto-Fetch"] --> B["Parse & OCR<br/>Docling + fallback parsing"]
    B --> C["Biomedical Extraction<br/>NLP + structured LLM parsing"]
    C --> D["Drug Normalization<br/>RxNorm / RxCUI / J-code"]
    D --> E["Store Structured Data<br/>PostgreSQL"]
    E --> F["Chunk + Embed<br/>policy text"]
    F --> G["Index Retrieval Data<br/>pgvector"]
    G --> H["Hybrid RAG Answers"]
    G --> I["Drug Coverage Comparison"]
    G --> J["Change Tracking + Policy Review"]
    K["Next.js App"] --> H
    K --> I
    K --> J
```

## What You Get

| Capability | What it does |
| --- | --- |
| Dashboard | Live counts, recent changes, indexed policies, and quick actions |
| Upload | Sends PDFs or DOCX files into the background ingestion pipeline |
| Auto-Fetch | Pulls policy files for supported payers and optionally auto-ingests them |
| Compare | Builds payer-by-payer coverage matrices for a target drug |
| Chat | Answers policy questions with grounded RAG responses and source references |
| API Docs | Interactive OpenAPI viewer exposed from the app |

## Architecture

AntonRX is split into two main parts:

- `src/`: Next.js 16 frontend, route handlers, UI, and API proxy layer
- `backend/`: FastAPI backend for ingestion, retrieval, policy fetchers, and RAG query logic

The current runtime flow is intentionally simple:

1. The Next.js app runs on port `3000`.
2. The FastAPI backend runs on port `8000`.
3. Frontend routes call or proxy the backend for policy ingestion, status, compare, fetch, and chat.
4. The backend stores structured policy data and retrieval chunks in PostgreSQL with `pgvector`.

### Backend Pipeline

The FastAPI side is centered around an 8-stage pipeline:

1. Parse/OCR the uploaded document
2. Extract biomedical entities and policy structure
3. Run structured LLM extraction
4. Normalize drugs with RxNorm
5. Save structured records to PostgreSQL
6. Chunk source text
7. Generate embeddings
8. Index chunks for retrieval

### Provider Support

Configured provider options in the repo today:

- `gemini`
- `anthropic`
- `groq`
- `nvidia`
- `ollama`

Auto-fetch adapters currently exist for:

- UnitedHealthcare
- Cigna
- Priority Health

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy, Pydantic Settings, Uvicorn |
| Data | PostgreSQL 16, pgvector, Drizzle ORM, Neon client libs |
| AI / NLP | Google Generative AI, RxNorm, Docling, optional scispaCy/Med7 path |
| Search | Hybrid structured lookup + vector retrieval |

## Quick Start

### Prereqs

- Node.js 20+
- Python 3.12+
- Docker Desktop or another Docker runtime
- A provider key if you want cloud LLMs
- Optional: Ollama if you want a local model path

### 1. Start the backend

From the repo root:

```bash
cd backend
cp ../.env.example .env
docker compose up db -d
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Then update `backend/.env` with the provider you want to use.

Important defaults:

- `DATABASE_URL` in `backend/.env` should stay in SQLAlchemy form:
  `postgresql+asyncpg://postgres:password@localhost:5432/antonrx`
- `LLM_PROVIDER` defaults to `ollama`
- If using Gemini, set `GEMINI_API_KEY`
- If using local Ollama, pull the models noted in `.env.example`

If you want the whole backend in Docker instead, this also works from `backend/`:

```bash
docker compose up --build
```

### 2. Start the frontend

In a second terminal, from the repo root:

```bash
cat > .env.local <<'EOF'
FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Optional: use the TypeScript scripts

If you want to run the root Drizzle scripts, add a root `DATABASE_URL` in `.env.local` or your shell using a plain Postgres URL, for example:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/antonrx
```

Then you can run:

```bash
npm run db:migrate
npm run db:seed
```

## API At A Glance

### FastAPI backend

- `POST /api/v1/ingest/upload`
- `GET /api/v1/ingest/status/{policy_id}`
- `GET /api/v1/ingest/policies`
- `GET /api/v1/ingest/policies/{policy_id}`
- `POST /api/v1/query/ask`
- `GET /api/v1/query/compare/{drug_name}`
- `POST /api/v1/fetch/policies`
- `POST /api/v1/fetch/ingest`
- `GET /api/v1/fetch/payers`
- `GET /health`

### Next.js app routes

- `/` dashboard
- `/upload` policy upload flow
- `/fetch` automated payer retrieval
- `/compare` side-by-side drug comparison
- `/chat` policy Q&A
- `/changes` recent policy updates
- `/api-docs` interactive API reference
- `/demo` product showcase page

## Repo Layout

```text
.
├── src/                 # Next.js app, UI, route handlers, shared TS libs
├── backend/             # FastAPI app, ingestion pipeline, fetchers, RAG services
├── scripts/             # Drizzle migration + seed helpers
├── docs/                # research, architecture, hackathon notes
├── public/              # static web assets
└── config/              # project configuration
```

## Notes

- The backend requirements file keeps some biomedical NLP packages optional right now, so the repo can still boot in environments where those heavy dependencies are tricky.
- The README only documents flows that are grounded in the current codebase.
- Source headers across the project currently note `CC BY-NC-SA 4.0` and a commercial-use contact at `chatgpt@asu.edu`.

## Team

Source headers credit:

- Abhinav
- Neeharika

## Disclaimer

AntonRX is a policy analysis tool, not medical advice. Always verify coverage decisions against official payer documentation.
