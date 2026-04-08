/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'InsightRX — Unified API',
      description:
        'Drug coverage tracking and comparison across major US payers.\n\n' +
        '**Architecture**: Next.js frontend (port 3000) + FastAPI backend (port 8000).\n' +
        '- **Neon DB routes** — served directly by Next.js via Drizzle ORM against Neon Postgres\n' +
        '- **FastAPI proxy routes** — Next.js proxies to FastAPI on localhost:8000\n' +
        '- **FastAPI native routes** — accessible directly at localhost:8000 or via /api/v1/* rewrite\n\n' +
        'The FastAPI backend runs an 8-stage ingestion pipeline: Docling PDF parsing → scispaCy/Med7 NLP → Gemini structured extraction → RxNorm normalization → PostgreSQL → chunking → embedding → pgvector indexing.',
      version: '2.0.0',
    },
    servers: [
      { url: '/', description: 'Next.js (port 3000)' },
      { url: 'http://localhost:8000', description: 'FastAPI (port 8000)' },
    ],
    tags: [
      { name: 'Dashboard', description: 'Aggregate stats (Neon DB)' },
      { name: 'Drugs', description: 'Drug search and coverage (Neon DB)' },
      { name: 'Changes', description: 'Policy version tracking (Neon DB)' },
      { name: 'Policies — Proxy', description: 'Policy CRUD proxied to FastAPI' },
      { name: 'AI — Proxy', description: 'RAG chat and PDF upload proxied to FastAPI' },
      { name: 'Ingestion — FastAPI', description: '8-stage ingestion pipeline (Docling, NLP, Gemini, RxNorm)' },
      { name: 'Query — FastAPI', description: 'Hybrid RAG Q&A and drug comparison' },
      { name: 'Health — FastAPI', description: 'Backend health check' },
    ],
    paths: {
      // ---- Neon DB routes (Next.js direct) ----
      '/api/stats': {
        get: {
          summary: 'Dashboard statistics',
          description: 'Aggregate counts from Neon Postgres: drugs, plans, policies, changes.',
          operationId: 'getStats',
          tags: ['Dashboard'],
          responses: {
            '200': {
              description: 'Dashboard stats',
              content: { 'application/json': { schema: { type: 'object', properties: { totalDrugs: { type: 'number' }, totalPlans: { type: 'number' }, totalPolicies: { type: 'number' }, totalChanges: { type: 'number' } } } } },
            },
          },
        },
      },
      '/api/drugs/search': {
        get: {
          summary: 'Search drugs',
          description: 'Search by drug name or J-code against Neon policy_claims table with RxCUI normalization.',
          operationId: 'searchDrugs',
          tags: ['Drugs'],
          parameters: [
            { name: 'q', in: 'query', required: true, description: 'Drug name or J-code (min 2 chars)', schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': {
              description: 'Drug search results',
              content: { 'application/json': { schema: { type: 'object', properties: { drugs: { type: 'array', items: { $ref: '#/components/schemas/DrugSearchResult' } } } } } },
            },
          },
        },
      },
      '/api/drugs/{rxcui}/coverage': {
        get: {
          summary: 'Drug coverage matrix',
          description: 'Coverage comparison across all plans for a given RxCUI. Joins policy_claims → policies → plans → payers.',
          operationId: 'getDrugCoverage',
          tags: ['Drugs'],
          parameters: [
            { name: 'rxcui', in: 'path', required: true, description: 'RxNorm Concept ID (e.g. 352385 for adalimumab)', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Coverage matrix', content: { 'application/json': { schema: { type: 'object', properties: { drug: { type: 'string' }, comparisons: { type: 'array', items: { $ref: '#/components/schemas/CoverageComparison' } } } } } } },
          },
        },
      },
      '/api/changes': {
        get: {
          summary: 'Recent policy changes',
          description: 'Policy version changes with structured diffs and LLM-generated summaries from Neon.',
          operationId: 'getChanges',
          tags: ['Changes'],
          parameters: [
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': { description: 'Change list', content: { 'application/json': { schema: { type: 'object', properties: { changes: { type: 'array', items: { $ref: '#/components/schemas/PolicyChange' } } } } } } },
          },
        },
      },

      // ---- FastAPI proxy routes (Next.js → FastAPI) ----
      '/api/policies': {
        get: {
          summary: 'List policies',
          description: 'Proxied to FastAPI `GET /api/v1/ingest/policies`. Returns policies from the local PostgreSQL database.',
          operationId: 'listPolicies',
          tags: ['Policies — Proxy'],
          responses: {
            '200': { description: 'Policy list from FastAPI backend' },
          },
        },
      },
      '/api/policies/{id}': {
        get: {
          summary: 'Policy detail',
          description: 'Proxied to FastAPI `GET /api/v1/ingest/policies/{id}`. Returns policy with full extracted data including hierarchical clinical criteria, step therapy, quantity limits.',
          operationId: 'getPolicy',
          tags: ['Policies — Proxy'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Full policy detail with drug coverages' },
            '404': { description: 'Policy not found' },
          },
        },
      },
      '/api/policies/upload': {
        post: {
          summary: 'Upload policy PDF',
          description: 'Proxied to FastAPI `POST /api/v1/ingest/upload`. Triggers the 8-stage pipeline: Docling parse → NLP extract → Gemini extract → RxNorm normalize → save → chunk → embed → index.',
          operationId: 'uploadPolicy',
          tags: ['AI — Proxy'],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary', description: 'Medical policy PDF' } } } } },
          },
          responses: {
            '200': { description: 'Upload accepted, pipeline started', content: { 'application/json': { schema: { type: 'object', properties: { policy_id: { type: 'string', format: 'uuid' }, status: { type: 'string' }, message: { type: 'string' } } } } } },
            '400': { description: 'Invalid file' },
          },
        },
      },
      '/api/chat': {
        post: {
          summary: 'RAG Q&A chat',
          description: 'Proxied to FastAPI `POST /api/v1/query/ask`. Hybrid retrieval: pgvector semantic search + SQL structured lookup → Gemini answer with citations.',
          operationId: 'chat',
          tags: ['AI — Proxy'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' } } } }, question: { type: 'string', description: 'Alternative: direct question string' }, drug_filter: { type: 'string', description: 'Optional drug name filter' }, payer_filter: { type: 'string', description: 'Optional payer name filter' } } } } },
          },
          responses: {
            '200': { description: 'RAG answer with citations and sources', content: { 'application/json': { schema: { $ref: '#/components/schemas/RAGResponse' } } } },
          },
        },
      },
      '/api/compare': {
        get: {
          summary: 'Compare drug across plans',
          description: 'Proxied to FastAPI `GET /api/v1/query/compare/{drug}`. Builds Drug × Payer comparison matrix with coverage status, step therapy, criteria.',
          operationId: 'compareDrug',
          tags: ['AI — Proxy'],
          parameters: [
            { name: 'drug', in: 'query', required: true, description: 'Drug name (e.g. adalimumab, Humira)', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Comparison matrix', content: { 'application/json': { schema: { $ref: '#/components/schemas/DrugComparison' } } } },
            '400': { description: 'Missing drug parameter' },
          },
        },
      },

      // ---- FastAPI native routes (direct access on :8000 or via /api/v1/* rewrite) ----
      '/api/v1/ingest/upload': {
        post: {
          summary: 'Upload policy (FastAPI direct)',
          description: '8-stage ingestion pipeline: Docling PDF parsing (97.9% table accuracy) → scispaCy/Med7 NLP entity extraction → Gemini 2.5 Flash structured extraction → RxNorm drug normalization → PostgreSQL save → paragraph-aware chunking → Gemini embedding (768-dim) → pgvector indexing.',
          operationId: 'fastapiUpload',
          tags: ['Ingestion — FastAPI'],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } },
          },
          responses: {
            '200': { description: 'Pipeline started' },
          },
        },
      },
      '/api/v1/ingest/status/{policy_id}': {
        get: {
          summary: 'Pipeline status',
          description: 'Check the processing status of a policy upload. Returns current pipeline stage (parsed → nlp_extracted → gemini_extracted → rxnorm_enriched → saved → chunked → embedded → indexed).',
          operationId: 'fastapiPipelineStatus',
          tags: ['Ingestion — FastAPI'],
          parameters: [
            { name: 'policy_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Pipeline status with stage information' },
            '404': { description: 'Policy not found' },
          },
        },
      },
      '/api/v1/ingest/policies': {
        get: {
          summary: 'List policies (FastAPI direct)',
          description: 'List all ingested policies from local PostgreSQL with status, page count, and payer info.',
          operationId: 'fastapiListPolicies',
          tags: ['Ingestion — FastAPI'],
          responses: {
            '200': { description: 'Policy list' },
          },
        },
      },
      '/api/v1/ingest/policies/{policy_id}': {
        get: {
          summary: 'Policy detail (FastAPI direct)',
          description: 'Full policy with hierarchical clinical criteria trees, step therapy, quantity limits, site-of-care, provider requirements, and drug coverages.',
          operationId: 'fastapiGetPolicy',
          tags: ['Ingestion — FastAPI'],
          parameters: [
            { name: 'policy_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Full policy detail' },
            '404': { description: 'Policy not found' },
          },
        },
      },
      '/api/v1/query/ask': {
        post: {
          summary: 'RAG Q&A (FastAPI direct)',
          description: 'Hybrid RAG: embeds question with Gemini, retrieves top-k chunks via pgvector cosine similarity, augments with structured SQL data, generates answer with Gemini 2.5 Flash including payer/plan citations.',
          operationId: 'fastapiAsk',
          tags: ['Query — FastAPI'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['question'], properties: { question: { type: 'string' }, drug_filter: { type: 'string' }, payer_filter: { type: 'string' }, top_k: { type: 'integer', default: 5 } } } } },
          },
          responses: {
            '200': { description: 'RAG answer with citations', content: { 'application/json': { schema: { $ref: '#/components/schemas/RAGResponse' } } } },
          },
        },
      },
      '/api/v1/query/compare/{drug_name}': {
        get: {
          summary: 'Compare drug across payers (FastAPI direct)',
          description: 'Builds a Drug × Payer comparison matrix showing coverage status, prior auth, step therapy, quantity limits, approved diagnoses, and clinical criteria for each payer.',
          operationId: 'fastapiCompare',
          tags: ['Query — FastAPI'],
          parameters: [
            { name: 'drug_name', in: 'path', required: true, description: 'Drug brand or generic name', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Drug comparison matrix', content: { 'application/json': { schema: { $ref: '#/components/schemas/DrugComparison' } } } },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Health check',
          description: 'FastAPI backend health status.',
          operationId: 'healthCheck',
          tags: ['Health — FastAPI'],
          responses: {
            '200': { description: 'Healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
          },
        },
      },
    },
    components: {
      schemas: {
        DrugSearchResult: {
          type: 'object',
          properties: {
            drugBrandName: { type: 'string', nullable: true },
            drugGenericName: { type: 'string', nullable: true },
            rxcui: { type: 'string', nullable: true },
            jCode: { type: 'string', nullable: true },
            planCount: { type: 'number' },
          },
        },
        CoverageComparison: {
          type: 'object',
          properties: {
            payerName: { type: 'string' },
            planName: { type: 'string' },
            lineOfBusiness: { type: 'string' },
            state: { type: 'string', nullable: true },
            productType: { type: 'string', nullable: true },
            coverageStatus: { type: 'string', enum: ['covered', 'not_covered', 'covered_with_criteria', 'experimental', 'not_addressed'] },
            priorAuth: { type: 'boolean' },
            extractedData: {
              type: 'object',
              properties: {
                stepTherapy: { type: 'array', items: { type: 'object', properties: { stepNumber: { type: 'integer' }, drugOrClass: { type: 'string' }, minDuration: { type: 'string' } } } },
                quantityLimits: { type: 'object', properties: { quantity: { type: 'number' }, unit: { type: 'string' }, period: { type: 'string' } } },
                clinicalCriteria: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, icdCodes: { type: 'array', items: { type: 'string' } } } } },
                siteOfCare: { type: 'string' },
              },
            },
            sourceExcerpt: { type: 'string', nullable: true },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            policyNumber: { type: 'string' },
            effectiveDate: { type: 'string', format: 'date' },
          },
        },
        PolicyChange: {
          type: 'object',
          properties: {
            payerName: { type: 'string' },
            planName: { type: 'string' },
            policyTitle: { type: 'string' },
            policyNumber: { type: 'string' },
            versionNumber: { type: 'integer' },
            effectiveDate: { type: 'string', format: 'date' },
            changeSummary: { type: 'string', nullable: true },
            diffJson: { type: 'array', nullable: true, items: { type: 'object', properties: { field: { type: 'string' }, old: { type: 'string', nullable: true }, new: { type: 'string', nullable: true }, significance: { type: 'string', enum: ['breaking', 'material', 'minor', 'cosmetic'] } } } },
          },
        },
        RAGResponse: {
          type: 'object',
          properties: {
            answer: { type: 'string', description: 'Generated answer with inline citations' },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  payer_name: { type: 'string' },
                  policy_title: { type: 'string' },
                  policy_number: { type: 'string' },
                  effective_date: { type: 'string' },
                  chunk_text: { type: 'string' },
                  similarity: { type: 'number' },
                },
              },
            },
            structured_data: { type: 'object', nullable: true, description: 'Matching drug coverages from SQL query' },
          },
        },
        DrugComparison: {
          type: 'object',
          properties: {
            drug_name: { type: 'string' },
            comparisons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  payer_name: { type: 'string' },
                  coverage_status: { type: 'string' },
                  prior_auth_required: { type: 'boolean' },
                  step_therapy: { type: 'array', items: { type: 'object', properties: { step_number: { type: 'integer' }, drug_or_class: { type: 'string' }, min_duration: { type: 'string' } } } },
                  quantity_limits: { type: 'array', items: { type: 'object', properties: { quantity: { type: 'number' }, unit: { type: 'string' }, period: { type: 'string' } } } },
                  clinical_criteria: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, icd_codes: { type: 'array', items: { type: 'string' } } } } },
                  approved_diagnoses: { type: 'array', items: { type: 'string' } },
                  policy_reference: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };

  return Response.json(spec);
}
