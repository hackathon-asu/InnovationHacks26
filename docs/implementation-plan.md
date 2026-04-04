# Anton RX Track — Implementation Plan

**Project**: InnovationHacks26 | **Date**: 2026-04-04

---

## Phase 0: Project Scaffolding (Current)

- [x] Architecture doc review
- [x] Skill audit
- [ ] Initialize Next.js 16 App Router project
- [ ] Install core dependencies: `ai`, `@ai-sdk/google`, `@ai-sdk/groq`, `drizzle-orm`, `@neondatabase/serverless`, `pdf-parse`, `zod`
- [ ] Install UI dependencies: `shadcn/ui` init, Geist font, dark mode default
- [ ] Create directory structure per architecture doc
- [ ] Configure `drizzle.config.ts`, `next.config.ts`, `vercel.json`
- [ ] Set up `.env.example` with required vars

## Phase 1: Database & Schema

- [ ] Define Drizzle ORM schema (`src/lib/db/schema.ts`) — 7 tables: payers, plans, policies, policy_versions, policy_claims, policy_chunks, processing_jobs
- [ ] Create DB connection module (`src/lib/db/index.ts`) using `@neondatabase/serverless`
- [ ] Write migration script (`scripts/migrate.ts`)
- [ ] Enable pgvector extension
- [ ] Create indexes (rxcui, j_code, brand_name, embedding IVFFlat)
- [ ] Verify schema against Neon free tier

## Phase 2: AI Extraction Pipeline

- [ ] PDF text extraction (`src/lib/pdf/extract.ts`) using `pdf-parse`
- [ ] Zod schemas for structured LLM output (`src/lib/ai/schemas.ts`)
- [ ] Gemini extraction with structured output (`src/lib/ai/extraction.ts`)
- [ ] LLM provider fallback chain: Gemini → Groq → Ollama
- [ ] RxNorm API client (`src/lib/rxnorm/client.ts`)
- [ ] Drug normalization: brand/generic mapping, RxCUI lookup (`src/lib/rxnorm/normalize.ts`)
- [ ] Embeddings generation with `gemini-embedding-001` (`src/lib/ai/embeddings.ts`)
- [ ] TypeScript types (`src/lib/types/`)

## Phase 3: Seed Script & Data

- [ ] Seed script (`scripts/seed.ts`) — process PDFs from `/data`
- [ ] Collect 3-5 real policy PDFs per payer (UHC, Aetna, Anthem, Cigna, Humana)
- [ ] Include 2 versions of select policies for change tracking demo
- [ ] Version diff computation during seeding (Gemini with temperature: 0)
- [ ] Policy extraction helper script (`scripts/extract-policy.ts`)
- [ ] Target drugs: Humira, Keytruda, Ozempic, + 2-3 others

## Phase 4: API Routes (P0)

- [ ] `GET /api/drugs/search` — drug search with RxNorm normalization
- [ ] `GET /api/drugs/[rxcui]/coverage` — coverage matrix for a drug
- [ ] `GET /api/compare` — Drug x Plan comparison grid
- [ ] `GET /api/policies` — list/search policies (paginated)
- [ ] `GET /api/policies/[id]` — policy detail with claims + provenance
- [ ] `GET /api/changes` — recent policy version changes with diffs
- [ ] `GET /api/stats` — dashboard aggregate counts
- [ ] Reusable query functions (`src/lib/db/queries.ts`)

## Phase 5: Frontend — Core Pages (P0)

- [ ] Root layout with dark mode, Geist font, sidebar nav
- [ ] `/` — Dashboard: stats cards, recent changes feed, quick search
- [ ] `/drugs` — Drug search with autocomplete
- [ ] `/drugs/[rxcui]` — Coverage comparison matrix (plans as rows, criteria as columns)
- [ ] `/compare` — Multi-drug, multi-plan comparison grid
- [ ] `/policies` — Filterable policy list with payer/plan chips
- [ ] `/policies/[id]` — Policy detail: claims, provenance, confidence badges
- [ ] `/changes` — Change timeline with diff summaries and version badges
- [ ] Shared components: sidebar, header, search bar

**Skills to use**: `shadcn`, `frontend-design`, `ui-ux-pro-max`, `vercel-react-best-practices`

## Phase 6: Frontend — P1 Features

- [ ] `/chat` — RAG Q&A with `useChat` + `DefaultChatTransport`
- [ ] `POST /api/chat` — streaming RAG endpoint (pgvector retrieval + Gemini)
- [ ] RAG retrieval logic (`src/lib/ai/rag.ts`)
- [ ] `/upload` — Drag-and-drop PDF upload with plan selector
- [ ] `POST /api/policies/upload` — upload + extraction pipeline
- [ ] Policy diff view (side-by-side visual diff)
- [ ] Citation cards in chat messages

**Skills to use**: `ai-rag-pipeline`, `rag-implementation`, `agentdb-vector-search`

## Phase 7: Polish & Deploy

- [ ] Error handling and loading states across all pages
- [ ] Input validation at API boundaries (Zod)
- [ ] Responsive design pass
- [ ] Vercel deployment config (`vercel.json`)
- [ ] Environment variable setup in Vercel dashboard
- [ ] Smoke test all P0 flows end-to-end
- [ ] Performance check (Server Components, streaming where appropriate)

**Skills to use**: `verification-quality`

---

## Relevant Skills Summary

| Skill | Phase | Purpose |
|---|---|---|
| `shadcn` | 0, 5 | UI component library setup and usage |
| `frontend-design` | 5, 6 | High-quality, non-generic UI design |
| `ui-ux-pro-max` | 5, 6 | Color palettes, typography, UX patterns |
| `vercel-react-best-practices` | 5, 6 | Server Components, hooks, performance |
| `ai-rag-pipeline` | 6 | RAG architecture patterns |
| `rag-implementation` | 6 | pgvector retrieval implementation |
| `agentdb-vector-search` | 6 | Vector search optimization |
| `verification-quality` | 7 | Quality gates before shipping |

## Tech Stack (All $0)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | shadcn/ui + Geist (dark mode) |
| Database | Neon Postgres + pgvector |
| ORM | Drizzle |
| LLM | Gemini 2.5 Flash → Groq Llama 3.3 → Ollama |
| Embeddings | Google gemini-embedding-001 (768-dim) |
| AI SDK | `@ai-sdk/google`, `@ai-sdk/groq` |
| Drug API | RxNorm (NIH, free) |
| PDF | pdf-parse |
| Deploy | Vercel Hobby |
