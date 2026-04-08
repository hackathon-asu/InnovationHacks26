# Technical Research: AI-Powered Medical Policy Document Parser and Comparison System

> **Last updated:** April 7, 2026

## 1. Document Ingestion

### 1.1 PDF Parsing Tools (Ranked by Suitability)

**Docling v2.85.0 (Recommended Primary)** — *~57,200 GitHub stars*
- Open-source framework by IBM for converting unstructured documents to structured formats
- Supports PDF, DOCX, PPTX, XLSX, HTML, Markdown, LaTeX, AsciiDoc, CSV, XBRL, images, and audio/video (via Whisper)
- Uses DocLayNet for layout analysis and **TableFormer v2** (released v2.78.0) for table structure recognition
- 97.9% accuracy on complex table extraction in 2025 benchmarks
- Exports to Markdown, HTML, JSON, DocTags, WebVTT
- **New since mid-2025:**
  - Pluggable VLM runtime with preset-based configuration (API, vLLM with CUDA graph mode, MLX on Apple Silicon)
  - New OCR engines: Falcon-OCR, LightOnOCR-2-1B, GLM OCR, KServe v2 remote OCR with gRPC
  - Headless browser HTML backend via Playwright for JavaScript-rendered pages (v2.82.0)
  - XBRL parser for financial instance reports with fact metadata and linkbase relationships
  - LaTeX (.tex) document parsing support
  - Unified inference engine abstraction (HF Transformers, ONNX Runtime, KServe v2)
  - Upgraded to transformers v5 and docling-parse v5 (significant parser rewrite)
  - DocumentFigureClassifier v2.5
  - Configurable ONNX Runtime graph optimization
- Integrations: LangChain, LlamaIndex, OpenAI-compatible VLM APIs
- License: MIT
- GitHub: https://github.com/docling-project/docling
- Website: https://www.docling.ai/

**Marker v1.10.2 (Datalab)** — *~33,500 GitHub stars*
- Full end-to-end OCR pipeline converting PDFs to Markdown/JSON/HTML
- Built on Surya OCR engine v0.17.1 with support for 90+ languages
- Good at layout detection and reading order determination
- Can optionally use an LLM to improve accuracy
- **New since mid-2025:**
  - v1.10.0: New layout model via Surya with major performance boost; `--html_tables_in_markdown` flag
  - v1.9.0: Block-mode inference — OCR at block level instead of line level (slower but significantly more accurate)
  - v1.8.3: New OCR model with better math recognition; improved accuracy-first heuristics
  - Surya v0.16.x: Multi-token inference, speed improvements, configurable attention method, SDPA fixes
- License: **GPL-3.0-or-later** (note: restrictive for commercial use)
- GitHub: https://github.com/datalab-to/marker

**Unstructured.io v0.22.16** — *~14,400 GitHub stars*
- Applies OCR and Transformer-based NLP models for text and table extraction
- Unified API across PDFs, DOCX, HTML, and images
- **New since mid-2025:**
  - v0.22.16: Formula markdown export with configurable styles (auto, display_math, plain), Unicode-to-LaTeX normalization
  - v0.22.14: Deduplicated PDF rendering — 97% peak memory reduction on large PDFs
  - v0.21.0: **Replaced NLTK with spaCy** to remediate CVE-2025-14009 (CVSS 10.0 RCE via NLTK's zipfile.extractall)
  - Active release cadence: 10+ releases in Feb–Apr 2026
- Enterprise "Platform" product available separately for production-grade ETL (partitioning, enrichments, chunking, embedding)
- License: Apache-2.0 (open-source library)
- Website: https://unstructured.io/

**Apache Tika**
- Detects and extracts metadata and text from 1000+ file types
- Mature, widely deployed in enterprise settings
- Used by government agencies for compliance monitoring
- Java-based; good for metadata extraction but weaker on complex layouts
- GitHub: https://github.com/apache/tika

**OpenDataLoader**
- Combines deterministic local extraction with bounding boxes for every element
- Built-in prompt injection protection (relevant for LLM pipelines)
- GitHub: https://github.com/opendataloader-project/opendataloader-pdf

### 1.1.1 Document Parser Comparison Matrix (2026)

| Feature | Docling v2.85 | Marker v1.10 | Unstructured v0.22 |
|---|---|---|---|
| **Stars** | ~57.2k | ~33.5k | ~14.4k |
| **Formats** | PDF, DOCX, PPTX, XLSX, HTML, MD, LaTeX, CSV, XBRL, images, audio/video | PDF (primary) | PDF, DOCX, HTML, images, many more |
| **OCR engines** | RapidOCR, EasyOCR, Tesseract, OcrMac, Falcon-OCR, LightOnOCR, GLM OCR, KServe remote | Surya v0.17.1 (custom) | Internal via unstructured-inference |
| **VLM support** | Yes (API, vLLM, MLX, preset system) | No | Via platform product |
| **Table extraction** | TableFormer v2 (best-in-class) | Surya table recognition | Basic |
| **License** | MIT | GPL-3.0 | Apache-2.0 |
| **Key strength** | Broadest format support, modular engine system | Best pure PDF-to-markdown quality | Enterprise ETL pipeline, connector ecosystem |

### 1.2 OCR Considerations for Medical Policies

Medical policy documents present specific challenges:
- **Multi-column layouts**: Common in payer policy bulletins; Docling and Marker handle these well
- **Embedded tables**: Drug lists, HCPCS code tables, ICD-10 criteria tables are critical; TableFormer v2 (Docling) is best-in-class
- **Headers/footers/page numbers**: Must be stripped to avoid contaminating parsed content
- **Scanned PDFs vs. digital PDFs**: Many older policies are scanned; OCR quality varies. Surya v0.17.1 (used by Marker) handles this well; Docling now offers 6+ OCR engine options
- **Watermarks and logos**: Can interfere with OCR; preprocessing may be needed
- **Math/formulas**: Marker v1.8.3+ has improved math recognition; Unstructured v0.22.16 added formula markdown export

### 1.3 Section Parsing Strategy

Medical policies follow semi-consistent structures across payers:

```
Typical Medical Policy Structure:
1. Policy Title / Number / Effective Date
2. Description / Background
3. Policy Statement (covered/not covered)
4. Clinical Criteria / Medical Necessity
   - Diagnosis requirements (ICD-10 codes)
   - Step therapy requirements
   - Prior authorization requirements
5. Applicable Codes (HCPCS, CPT, ICD-10, J-codes)
6. Documentation Requirements
7. References / Bibliography
8. Revision History
```

Recommended approach: Use Docling/Marker to extract structured sections, then apply regex + LLM-based classification to identify section types.

### 1.4 HTML Ingestion

Many payers publish policies as HTML pages. Strategies:
- **Docling v2.82.0+**: Headless browser HTML backend via Playwright for JavaScript-rendered pages (recommended)
- Use Playwright/Puppeteer for JavaScript-rendered pages (standalone)
- BeautifulSoup/lxml for static HTML
- Watch for session-gated content requiring authentication

---

## 2. NLP/AI for Medical Policy Parsing

### 2.1 Key Entities to Extract

| Entity Type | Examples | Extraction Difficulty |
|---|---|---|
| Drug names (brand) | Humira, Keytruda, Ozempic | Medium - well-defined vocabulary |
| Drug names (generic) | adalimumab, pembrolizumab, semaglutide | Medium - map via RxNorm |
| HCPCS/J-codes | J0135 (adalimumab), J9271 (pembrolizumab) | Low - regex pattern `J\d{4}` |
| CPT codes | 96413 (chemo infusion) | Low - regex pattern `\d{5}` |
| ICD-10 codes | C50.911 (breast cancer), M06.9 (RA) | Low - regex `[A-Z]\d{2}\.?\d{0,4}` |
| Clinical criteria | "Failed 2 conventional DMARDs" | High - requires NLU |
| Step therapy requirements | "Must try methotrexate before biologics" | High - requires relationship extraction |
| Quantity limits | "4 vials per 28 days" | Medium - pattern matching + NLU |
| Site-of-care requirements | "Home infusion preferred over hospital outpatient" | High - requires contextual understanding |
| Provider specialty | "Must be prescribed by oncologist" | Medium - NER + role extraction |
| Age/gender restrictions | "Approved for patients >= 18 years" | Medium - pattern matching |
| Duration limits | "Initial approval for 6 months" | Medium - temporal expression extraction |

### 2.2 Healthcare NLP Libraries

**MedSpaCy v1.x (Recommended for rule-based + ML hybrid)**
- Clinical NLP built on spaCy 3.x
- Key components: `ConTextComponent` (negation/experiencer/temporality detection), `Sectionizer`, `TargetMatcher`, `QuickUMLS` integration, `Postprocessor`
- Updated ConText algorithm for better negation, experiencer, and temporality detection
- Growing adoption in VA and academic medical center NLP pipelines
- Maintained by University of Utah / VA Salt Lake City
- GitHub: https://github.com/medspacy/medspacy

**scispaCy v0.5.4 (Recommended for biomedical NER)**
- spaCy 3.x models for biomedical/clinical text; integrates with HuggingFace transformers
- Pre-trained models: `en_core_sci_sm`, `en_core_sci_md`, `en_core_sci_lg`, `en_core_sci_scibert`, `en_ner_bc5cdr_md` (drugs + diseases), `en_ner_craft_md`, `en_ner_jnlpba_md`, `en_ner_bionlp13cg_md`
- Entity linking to UMLS, MeSH, RxNorm, Gene Ontology, HPO
- F1 score ~85.53 on biomedical NER benchmarks
- Maintained by Allen Institute for AI (AI2); development pace slowed — incremental compatibility fixes only
- Website: https://allenai.github.io/scispacy/

**Med7 (Specialized for medication extraction)**
- Dedicated NER for 7 medication concepts: dosage, drug name, duration, form, frequency, route, strength
- Built on spaCy; community forks exist for spaCy v3 compatibility
- No official major version bump; original paper (Kormilitzin et al.) remains primary reference
- Good for extracting quantity limits and dosing details; largely absorbed by MedSpaCy use cases

**BioBERT / PubMedBERT (Best accuracy for BERT-scale NER)**
- BioBERT v1.1 achieves F1 87.83 on biomedical NER (outperforms scispaCy's 85.53)
- PubMedBERT (`microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext`) — state-of-the-art on BLURB benchmarks
- Still dominates for NER, relation extraction, and classification where BERT-scale efficiency matters
- **Trend (2025–2026):** Community shifting toward fine-tuning larger open LLMs (7B–70B) for biomedical tasks; BERT-scale models remain relevant for latency-sensitive classification/NER

**Newer large-scale clinical/biomedical models:**
- **GatorTron** (UF/NVIDIA): 8.9B parameters trained on 90B+ words of clinical text — positioned as ClinicalBERT's successor
- **GatorTronGPT**: Generative variant for clinical text generation
- **BioMistral**: Mistral fine-tune for biomedical text
- **Me-LLaMA**: Medical LLaMA fine-tune for clinical tasks
- **BioGPT** (Microsoft): GPT-style biomedical generative model
- **BioMedLM** (Stanford CRFM): 2.7B parameter model trained on PubMed
- General frontier LLMs (Gemini 2.5, Claude 4, Llama 3.3) typically outperform specialized models on extraction tasks with good prompts

**John Snow Labs Spark NLP for Healthcare v5.x (Enterprise option)**
- 700+ pre-trained clinical models and pipelines
- Clinical NER (100+ entity types), assertion detection, de-identification (HIPAA), relation extraction, clinical summarization, ICD-10/CPT/SNOMED coding
- New: Generative AI healthcare modules, medical document understanding, zero-shot clinical NER, RAG pipelines
- Requires commercial license (annual subscription; free for certain research)

**Amazon Comprehend Medical (Cloud option)**
- HIPAA-eligible; extracts medications, conditions, tests, procedures from clinical text
- Supports **ICD-10-CM**, **RxNorm**, and **SNOMED CT** entity linking
- Pricing: per-character for `DetectEntities`, `InferICD10CM`, `InferRxNorm`, `InferSNOMEDCT`
- Stable but not rapidly evolving; AWS investing more in HealthLake and Bedrock for healthcare generative AI

### 2.3 Recommended NLP Pipeline

```
Input Document (PDF/HTML)
    |
    v
[Docling v2.85 / Marker v1.10] --> Structured Markdown/JSON with sections
    |
    v
[Section Classifier] --> Identify: Criteria, Codes, Requirements
    |
    v
[scispaCy + Med7 NER] --> Extract: drugs, diagnoses, dosages
    |
    v
[Regex Extractors] --> Extract: HCPCS codes, ICD-10, CPT codes
    |
    v
[LLM Structured Output] --> Extract: complex criteria, step therapy logic, relationships
    |          (Gemini 2.5 Pro/Flash or Claude Sonnet 4 via AI SDK)
    v
[RxNorm/UMLS Linker] --> Normalize entities to standard codes
    |
    v
Structured Policy Object (JSON)
```

---

## 3. Medical Ontologies and Terminologies

### 3.1 RxNorm (Drug Normalization)

- Maintained by NIH National Library of Medicine
- Provides normalized names for clinical drugs
- Core identifier: RxCUI (unique integer per concept)
- Concept types: Ingredient, Brand Name, Clinical Drug, Dose Form
- Example: "Fluoxetine 4 MG/ML Oral Solution" decomposes to ingredient + strength + dose form
- **Monthly releases** continue (first Monday of each month)
- **API update (2025–2026):** NLM transitioned to unified UMLS API authentication — **all calls now require a UMLS API key** (unauthenticated access deprecated)
- **RxNav** web applications still available but NLM signaled potential sunsetting of some legacy REST endpoints
- Focus on stability and FHIR Terminology Service compatibility
- **API**: RxNav (https://lhncbc.nlm.nih.gov/RxNav/) — free, requires UMLS API key
- **Key API endpoints**:
  - `/REST/rxcui.json?name={drugName}` - get RxCUI from drug name
  - `/REST/rxcui/{rxcui}/allrelated.json` - get all related concepts
  - `/REST/interaction/list.json?rxcuis={rxcui1}+{rxcui2}` - drug interactions

### 3.2 HCPCS Codes (Procedures/Drugs administered by providers)

- Maintained by CMS
- Level I: CPT codes (AMA) for procedures
- Level II: Alphanumeric codes for drugs, supplies, services
- J-codes (J0000-J9999): Injectable drugs administered by providers
  - Example: J0135 = adalimumab (Humira) injection
  - Example: J9271 = pembrolizumab (Keytruda) injection
- Critical for medical policy parsing: policies reference J-codes for injectable/infused drugs

### 3.3 ICD-10 (Diagnoses)

- ICD-10-CM: Clinical Modification used in the US
- Hierarchical structure: Category (3 chars) > Etiology/Site (4-5 chars) > Extension (6-7 chars)
- Example: M06.9 = Rheumatoid arthritis, unspecified
- Annual updates each October; policies must reference correct year's codes

### 3.4 SNOMED-CT (Clinical Terms)

- Most comprehensive clinical terminology (~350,000 concepts)
- Used in EHRs for clinical documentation
- Maps to ICD-10 via NLM's mapping project (updated March/September)
- I-MAGIC tool for interactive SNOMED-to-ICD-10 mapping

### 3.5 UMLS (2025AA)

- **UMLS 2025AA** is the latest annual release (typically May each year; 2024AB was the fall 2024 release)
- Contains 200+ source vocabularies including SNOMED CT, ICD-10, RxNorm, LOINC, CPT, MeSH
- NLM requires a UMLS license (free, requires sign-up and agreement)
- **UMLS REST API** is the standard access method; Metathesaurus Browser still available
- NLM modernizing infrastructure with cloud-based access improvements

### 3.6 Cross-System Mapping Strategy

```
Drug in Policy Text
    |
    +--[scispaCy NER]--> Drug Name (text)
    |                        |
    |                        +--[RxNorm API]--> RxCUI
    |                                             |
    |                                             +--[RxNorm]--> NDC codes
    |                                             +--[Crosswalk]--> HCPCS J-code
    |
    +--[Regex]--> J-code directly from policy
    |                |
    |                +--[HCPCS lookup]--> Drug description
    |                +--[NDC crosswalk]--> NDC codes
    |
    +--[Regex]--> ICD-10 codes from policy
                     |
                     +--[SNOMED map]--> SNOMED concepts
                     +--[Hierarchy]--> Parent/child diagnoses
```

**Available crosswalk services**:
- HIPAASpace (https://www.hipaaspace.com/): HCPCS-to-NDC, ICD-10-to-ICD-9, SNOMED-to-ICD-10
- NLM UMLS: Comprehensive terminology integration (ICD-9, ICD-10, CPT, SNOMED-CT, LOINC, RxNorm)
- NCATS Code Map Services: Cross-terminology mappings with public APIs
- Tuva Project: Open-source SNOMED-to-ICD-10 mapping (https://thetuvaproject.com/)

---

## 4. LLM-Based Extraction Approaches

### 4.1 Structured Output with AI SDK

Using the Vercel AI SDK v4.x with structured output (Zod schemas) for extraction:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const MedicalPolicySchema = z.object({
  policyId: z.string().describe('Policy identifier or number'),
  policyTitle: z.string().describe('Full policy title'),
  effectiveDate: z.string().describe('Policy effective date in ISO format'),
  drug: z.object({
    brandName: z.string().describe('Brand name of the drug'),
    genericName: z.string().describe('Generic/INN name'),
    jCode: z.string().optional().describe('HCPCS J-code if referenced'),
    rxcui: z.string().optional().describe('RxNorm concept identifier'),
  }),
  coverageDecision: z.enum(['covered', 'not_covered', 'covered_with_criteria']),
  priorAuthRequired: z.boolean(),
  clinicalCriteria: z.array(z.object({
    criterionType: z.enum([
      'diagnosis', 'step_therapy', 'lab_result',
      'age', 'provider_specialty', 'site_of_care',
      'quantity_limit', 'duration_limit', 'other'
    ]),
    description: z.string().describe('Human-readable description of the criterion'),
    icdCodes: z.array(z.string()).optional(),
    required: z.boolean().describe('Whether this criterion is mandatory'),
    alternatives: z.array(z.string()).optional()
      .describe('Alternative criteria that can satisfy this requirement'),
  })),
  stepTherapy: z.object({
    required: z.boolean(),
    steps: z.array(z.object({
      stepNumber: z.number(),
      drugOrClass: z.string().describe('Drug or drug class required at this step'),
      minimumDuration: z.string().optional().describe('Minimum trial period'),
      failureCriteria: z.string().optional().describe('What constitutes failure'),
    })),
  }).optional(),
  quantityLimits: z.array(z.object({
    quantity: z.number(),
    unit: z.string().describe('e.g., vials, tablets, mg'),
    period: z.string().describe('e.g., per 28 days, per month'),
  })).optional(),
  siteOfCare: z.object({
    preferred: z.string().optional().describe('Preferred administration site'),
    restricted: z.array(z.string()).optional().describe('Sites not covered'),
    exceptions: z.string().optional(),
  }).optional(),
  applicableCodes: z.object({
    hcpcs: z.array(z.string()),
    icd10: z.array(z.string()),
    cpt: z.array(z.string()).optional(),
  }),
});

const result = await generateObject({
  model: google('gemini-2.5-pro'),  // or anthropic('claude-sonnet-4-5')
  schema: MedicalPolicySchema,
  prompt: `Extract structured policy data from this medical policy document.
           Be precise with codes and criteria. If information is not present,
           omit the optional field rather than guessing.

           Document:
           ${policyText}`,
});
```

### 4.2 LLM Model Selection for Medical Extraction (2026)

| Model | Strengths | Structured Output | Cost | Best For |
|---|---|---|---|---|
| **Gemini 2.5 Pro** | Strong reasoning, "thinking" mode, native JSON schema | Native via `response_schema` | Medium | Complex criteria extraction, multi-page policies |
| **Gemini 2.5 Flash** | Fast, controllable thinking budget | Native via `response_schema` | Low | High-volume extraction, simple policies |
| **Claude Sonnet 4** | Excellent instruction following, nuanced text | Via tool use | Medium | Step therapy logic, ambiguous criteria |
| **Claude Opus 4** | Strongest reasoning (Anthropic) | Via tool use | High | Audit-grade extraction, complex edge cases |
| **Llama 3.3 70B** | Open weights, 128K context | Via constrained decoding | Self-hosted | On-premise / air-gapped deployments |
| **Llama 4 Scout** | 10M context, MoE (17B active) | Via constrained decoding | Self-hosted | Very long documents |
| **DeepSeek-R1** | Strong reasoning, open weights | JSON mode | Self-hosted | Cost-sensitive reasoning tasks |
| **Mistral Small 3 (24B)** | Apache 2.0, good structured output | JSON mode | Self-hosted | Budget-conscious deployments |

### 4.3 Prompt Engineering for Medical Documents

Key prompt engineering strategies:

**Chain-of-thought for criteria extraction**:
```
First, identify the drug(s) covered by this policy.
Then, list all diagnosis codes (ICD-10) that qualify for coverage.
Next, identify any step therapy requirements in order.
Then, extract quantity limits and duration restrictions.
Finally, note any site-of-care or provider specialty requirements.
```

**Few-shot examples**: Provide 2-3 examples of correctly extracted policies from different payers to establish the expected output format and level of detail.

**Section-by-section processing**: For long policies (10+ pages), process sections independently to avoid context window limitations and improve accuracy:
1. Extract metadata (title, dates, policy number) from first page
2. Extract coverage decision from policy statement section
3. Extract clinical criteria from medical necessity section
4. Extract codes from applicable codes section
5. Merge results into final structured object

### 4.4 RAG Architecture for Policy Q&A

```
User Query: "Does Aetna cover Keytruda for breast cancer?"
    |
    v
[Query Embedding] --> text-embedding-004 or NV-Embed-v2
    |
    v
[Vector Search] --> Find top-k relevant policy chunks
    |                 (filtered by payer="Aetna", drug="pembrolizumab")
    |
    v
[Reranker] --> Cross-encoder reranking for precision
    |
    v
[LLM with Context] --> Generate answer with citations
    |
    v
Structured Answer:
  - Coverage: Covered with criteria
  - Required: HER2-positive, failed trastuzumab
  - Prior auth: Yes
  - Source: Aetna Policy #0845, effective 01/2026
```

**Vector database options (2026 landscape)**:

| DB | Version | Key Features | Best For |
|---|---|---|---|
| **pgvector** | v0.8.0 | IVFFlat + HNSW indexes, halfvec quantization, parallel HNSW builds, hamming/jaccard for binary vectors | SQL integration, moderate scale |
| **Pinecone** | Serverless | Pay-per-query pricing, built-in inference/embedding endpoint, integrated reranking, sparse-dense hybrid search | Managed, bursty workloads |
| **Weaviate** | v1.28.x | Named vectors (multiple per object), multi-tenancy (hot/cold/frozen), BQ/PQ/SQ quantization, Raft-based replication | Complex multi-vector schemas |
| **Chroma** | v0.6.x | Chroma Cloud (hosted), Rust backend rewrite, auth + multi-tenancy | Prototyping, simple RAG |

**Embedding model recommendations (2026)**:

| Model | Dimensions | Medical Accuracy | Speed | Notes |
|---|---|---|---|---|
| **MedCPT** (NCBI) | 768 | Excellent (medical retrieval) | Fast | Best specialized medical retrieval model |
| **PubMedBERT Embeddings** | 768 | 95.62% Pearson | Fast | Best for medical domain NER/similarity |
| **NV-Embed-v2** (NVIDIA) | ~4096 | Strong (MTEB SOTA) | Medium | ~7B params, state-of-the-art general |
| **BGE-M3** (BAAI) | 1024 | Strong | Fast | Multi-lingual, dense+sparse+ColBERT |
| **GTE-Qwen2** (Alibaba) | Variable | Strong | Fast | Competitive with OpenAI |
| **text-embedding-004** (Google) | 768 | Good (general) | Fast | 2048 token input, via Gemini API |
| **text-embedding-3-large** (OpenAI) | 3072 | Good (general) | Fast | Matryoshka dimension reduction |
| **SapBERT** | 768 | Excellent for entity linking | Medium | UMLS concept matching |
| **Nomic Embed** | Variable | Good | Fast | Open-source, 8192 token context |

---

## 5. Data Model Design

### 5.1 Core Schema

```sql
-- Payer/Health Plan
CREATE TABLE payers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,           -- "Aetna", "UnitedHealthcare"
    plan_types TEXT[],            -- ["Commercial", "Medicare", "Medicaid"]
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Policy Document
CREATE TABLE policies (
    id UUID PRIMARY KEY,
    payer_id UUID REFERENCES payers(id),
    policy_number TEXT NOT NULL,  -- "0845"
    title TEXT NOT NULL,
    effective_date DATE NOT NULL,
    last_reviewed DATE,
    next_review_date DATE,
    status TEXT CHECK (status IN ('active', 'archived', 'draft')),
    source_url TEXT,
    source_document_hash TEXT,   -- SHA-256 of source for change detection
    raw_text TEXT,               -- Full extracted text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(payer_id, policy_number, effective_date)
);

-- Policy Version History
CREATE TABLE policy_versions (
    id UUID PRIMARY KEY,
    policy_id UUID REFERENCES policies(id),
    version_number INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    change_summary TEXT,         -- LLM-generated summary of changes
    diff_json JSONB,             -- Structured diff from previous version
    source_document_hash TEXT,
    raw_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drug Coverage Determination
CREATE TABLE drug_coverages (
    id UUID PRIMARY KEY,
    policy_id UUID REFERENCES policies(id),
    drug_brand_name TEXT,
    drug_generic_name TEXT,
    rxcui TEXT,                  -- RxNorm concept ID
    j_code TEXT,                 -- HCPCS J-code
    ndc_codes TEXT[],            -- NDC codes
    coverage_status TEXT CHECK (coverage_status IN (
        'covered', 'not_covered', 'covered_with_criteria',
        'experimental', 'not_addressed'
    )),
    prior_auth_required BOOLEAN DEFAULT FALSE,
    plan_types TEXT[],           -- Which plan types this applies to
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Criteria (Tree Structure)
CREATE TABLE clinical_criteria (
    id UUID PRIMARY KEY,
    drug_coverage_id UUID REFERENCES drug_coverages(id),
    parent_id UUID REFERENCES clinical_criteria(id), -- For nested criteria
    criterion_type TEXT CHECK (criterion_type IN (
        'diagnosis', 'step_therapy', 'lab_result', 'age',
        'gender', 'provider_specialty', 'site_of_care',
        'quantity_limit', 'duration_limit', 'documentation',
        'comorbidity', 'contraindication', 'other'
    )),
    logic_operator TEXT CHECK (logic_operator IN ('AND', 'OR', 'NOT')),
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ICD-10 codes associated with criteria
CREATE TABLE criteria_icd_codes (
    id UUID PRIMARY KEY,
    criterion_id UUID REFERENCES clinical_criteria(id),
    icd10_code TEXT NOT NULL,    -- e.g., "M06.9"
    icd10_description TEXT,
    code_range_start TEXT,       -- For ranges like "C50.0-C50.9"
    code_range_end TEXT
);

-- Step Therapy Requirements
CREATE TABLE step_therapy (
    id UUID PRIMARY KEY,
    drug_coverage_id UUID REFERENCES drug_coverages(id),
    step_number INTEGER NOT NULL,
    drug_or_class TEXT NOT NULL,  -- "methotrexate" or "conventional DMARD"
    min_duration TEXT,            -- "90 days"
    min_dose TEXT,                -- "15mg/week"
    failure_definition TEXT,      -- "Inadequate response after 3 months"
    contraindication_bypass BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

-- Quantity Limits
CREATE TABLE quantity_limits (
    id UUID PRIMARY KEY,
    drug_coverage_id UUID REFERENCES drug_coverages(id),
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,           -- "vials", "tablets", "mg"
    period TEXT NOT NULL,         -- "28 days", "month", "year"
    max_daily_dose TEXT,
    notes TEXT
);

-- Site of Care Requirements
CREATE TABLE site_of_care (
    id UUID PRIMARY KEY,
    drug_coverage_id UUID REFERENCES drug_coverages(id),
    preferred_site TEXT,          -- "home_infusion"
    allowed_sites TEXT[],         -- ["home", "physician_office"]
    restricted_sites TEXT[],      -- ["hospital_outpatient"]
    exception_criteria TEXT
);

-- Provider Specialty Requirements
CREATE TABLE provider_requirements (
    id UUID PRIMARY KEY,
    drug_coverage_id UUID REFERENCES drug_coverages(id),
    required_specialty TEXT,      -- "oncology"
    prescriber_type TEXT,         -- "physician", "NP", "PA"
    consultation_required BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Embeddings for semantic search
CREATE TABLE policy_chunks (
    id UUID PRIMARY KEY,
    policy_id UUID REFERENCES policies(id),
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    section_type TEXT,            -- "criteria", "codes", "background"
    embedding vector(768),       -- MedCPT or PubMedBERT dimension
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_policy_chunks_embedding ON policy_chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_drug_coverages_rxcui ON drug_coverages(rxcui);
CREATE INDEX idx_drug_coverages_jcode ON drug_coverages(j_code);
CREATE INDEX idx_criteria_icd_codes ON criteria_icd_codes(icd10_code);
CREATE INDEX idx_policies_payer ON policies(payer_id, status);
```

> **Note (2026 update):** Index type changed from IVFFlat to **HNSW** based on pgvector 0.8.0 improvements — HNSW provides better recall without requiring training and supports parallel index builds. The `halfvec` type can be used for scalar quantization to reduce memory footprint.

### 5.2 TypeScript Interface (Application Layer)

```typescript
interface MedicalPolicy {
  id: string;
  payer: { id: string; name: string; planTypes: string[] };
  policyNumber: string;
  title: string;
  effectiveDate: string;
  status: 'active' | 'archived' | 'draft';
  drugCoverages: DrugCoverage[];
}

interface DrugCoverage {
  id: string;
  drug: {
    brandName: string;
    genericName: string;
    rxcui?: string;
    jCode?: string;
    ndcCodes?: string[];
  };
  coverageStatus: 'covered' | 'not_covered' | 'covered_with_criteria' | 'experimental';
  priorAuthRequired: boolean;
  criteria: ClinicalCriterion[];
  stepTherapy?: StepTherapyRequirement[];
  quantityLimits?: QuantityLimit[];
  siteOfCare?: SiteOfCareRequirement;
  providerRequirements?: ProviderRequirement[];
}

interface ClinicalCriterion {
  id: string;
  type: CriterionType;
  description: string;
  required: boolean;
  logicOperator?: 'AND' | 'OR' | 'NOT';
  icdCodes?: { code: string; description: string }[];
  children?: ClinicalCriterion[]; // Nested criteria tree
}

type CriterionType =
  | 'diagnosis' | 'step_therapy' | 'lab_result'
  | 'age' | 'gender' | 'provider_specialty'
  | 'site_of_care' | 'quantity_limit' | 'duration_limit'
  | 'documentation' | 'comorbidity' | 'contraindication';
```

### 5.3 Alignment with FHIR Standards

The data model should align with FHIR R4 (4.0.1) resources for interoperability (R5 published but adoption is early):
- **CoverageEligibilityResponse**: Maps to `drug_coverages` table; includes `authorizationRequired`, `authorizationSupporting`, and benefit details
- **ServiceRequest**: Maps prior authorization requests
- **Claim/ClaimResponse**: Maps coverage determination outcomes
- **DocumentReference**: Links to source policy documents

**Da Vinci Implementation Guides (critical for CMS compliance):**
- **Prior Authorization Support (PAS)** STU 2.0.1: Defines `$submit` operation using FHIR `Claim`/`ClaimResponse` with X12 278 mapping
- **Coverage Requirements Discovery (CRD)**: CDS Hooks-based; alerts providers at point of care about PA requirements
- **Documentation Templates and Rules (DTR)**: Automates documentation requirements

CMS rule **CMS-0057-F** mandates FHIR-based prior authorization APIs (see Section 9 for compliance timeline).

### 5.4 Clinical Quality Language (CQL) for Criteria

CQL provides a computable representation of clinical criteria:

```cql
library AdalimumabCriteria version '1.0.0'
using FHIR version '4.0.1'

context Patient

define "Has Rheumatoid Arthritis":
  exists([Condition: "M06.9"])

define "Failed Methotrexate":
  exists([MedicationRequest: "methotrexate"] M
    where M.status = 'completed'
    and duration in months of
      (M.authoredOn, Now()) >= 3)

define "Meets Criteria":
  "Has Rheumatoid Arthritis"
    and "Failed Methotrexate"
```

CQL engines exist as open-source implementations (https://github.com/cqframework/clinical_quality_language) and can execute these rules against FHIR-formatted patient data.

---

## 6. Change Detection

### 6.1 Document-Level Change Detection Pipeline

```
[Scheduled Crawler] --> Fetch policy URL / PDF
    |
    v
[Hash Comparison] --> Compare SHA-256 of new document vs stored hash
    |                   (If unchanged, skip processing)
    v
[Document Parser] --> Extract structured text via Docling v2.85
    |
    v
[Section Alignment] --> Match sections between versions using
    |                    section headers and content similarity
    v
[Diff Generation] --> Compute structured diff per section
    |
    v
[LLM Summarization] --> Generate human-readable change summary
    |
    v
[Notification] --> Alert stakeholders about material changes
```

### 6.2 Diff Algorithms for Semi-Structured Medical Documents

**Text-level diffing**:
- GNU diff / unified diff: Works for flat text but misses structural changes
- difflib (Python): Good baseline for section-level comparison
- diff-match-patch (Google): Character-level precision, good for inline changes

**Structured diffing (recommended)**:
- **X-Diff algorithm**: Designed for XML/hierarchical data; treats documents as unordered trees where only ancestor relationships matter. Well-suited for medical policies where section order may change without changing meaning.
- **X-tree Diff**: Uses hash-valued fields representing subtree structure for efficient comparison. Good for detecting moved sections.
- **JSON Diff**: After extracting policies to structured JSON, use json-diff or deep-diff libraries to compare structured policy objects field by field.

**Semantic diffing**:
- Compare vector embeddings of sections between versions
- Cosine similarity below threshold (e.g., < 0.95) flags a section as materially changed
- Useful for catching paraphrased changes that don't show up in text diff

### 6.3 Version Control Strategy

```typescript
interface PolicyDiff {
  policyId: string;
  previousVersion: number;
  currentVersion: number;
  effectiveDate: string;
  changes: PolicyChange[];
  summary: string; // LLM-generated
}

interface PolicyChange {
  changeType: 'added' | 'removed' | 'modified';
  section: string;          // "clinical_criteria", "quantity_limits", etc.
  field?: string;           // Specific field that changed
  previousValue?: string;
  newValue?: string;
  significance: 'breaking' | 'material' | 'minor' | 'cosmetic';
}
```

**Significance classification**:
- **Breaking**: Drug removed from coverage, new step therapy requirement added
- **Material**: ICD-10 codes added/removed, quantity limit changed, new documentation requirement
- **Minor**: Wording clarification without criteria change, date updates
- **Cosmetic**: Formatting changes, typo fixes

---

## 7. Search and Comparison

### 7.1 Vector Embeddings for Semantic Search

**Recommended embedding models (2026)**:

| Model | Dimensions | Medical Accuracy | Speed | Use Case |
|---|---|---|---|---|
| MedCPT (NCBI) | 768 | Excellent (medical IR) | Fast | Best for medical document retrieval |
| PubMedBERT Embeddings | 768 | 95.62% Pearson | Fast | Medical domain similarity |
| NV-Embed-v2 (NVIDIA) | ~4096 | MTEB SOTA | Medium | Highest general accuracy |
| BGE-M3 (BAAI) | 1024 | Strong | Fast | Multi-lingual, hybrid dense+sparse |
| text-embedding-004 (Google) | 768 | Good (general) | Fast | Via Gemini API |
| text-embedding-3-large (OpenAI) | 3072 | Good (general) | Fast | Matryoshka dimension reduction |
| SapBERT | 768 | Excellent for entity linking | Medium | Terminology matching |

**Chunking strategy for policies**:
- Chunk by section (criteria, codes, background)
- Keep drug name + payer as metadata on every chunk
- Overlap chunks by 100-200 tokens for context continuity
- Maximum chunk size: 512 tokens for PubMedBERT/MedCPT, 2048 for Google, 8191 for OpenAI

### 7.2 Comparison Matrix Architecture

Build a Drug x Payer x Criteria comparison matrix:

```typescript
interface ComparisonMatrix {
  drug: {
    brandName: string;
    genericName: string;
    rxcui: string;
    jCode?: string;
  };
  payers: PayerComparison[];
}

interface PayerComparison {
  payer: string;
  planType: string;
  coverageStatus: string;
  priorAuth: boolean;
  stepTherapyRequired: boolean;
  stepTherapySteps?: number;
  quantityLimit?: string;
  siteOfCare?: string;
  approvedDiagnoses: string[];   // ICD-10 codes
  keyDifferences: string[];       // LLM-generated comparison notes
  policyReference: string;        // Link to source policy
  lastUpdated: string;
}
```

**Query patterns**:
```sql
-- Compare coverage for a drug across payers
SELECT p.name as payer, dc.coverage_status, dc.prior_auth_required,
       array_agg(DISTINCT ci.icd10_code) as diagnoses
FROM drug_coverages dc
JOIN policies pol ON dc.policy_id = pol.id
JOIN payers p ON pol.payer_id = p.id
LEFT JOIN clinical_criteria cc ON cc.drug_coverage_id = dc.id
LEFT JOIN criteria_icd_codes ci ON ci.criterion_id = cc.id
WHERE dc.rxcui = '1156198'  -- adalimumab
  AND pol.status = 'active'
GROUP BY p.name, dc.coverage_status, dc.prior_auth_required;
```

### 7.3 Natural Language Q&A System

Architecture for answering questions like "Which payers cover Keytruda for NSCLC without step therapy?":

1. **Intent classification**: Determine query type (coverage lookup, comparison, criteria detail)
2. **Entity extraction**: Drug name, payer, diagnosis, specific requirement
3. **Structured query**: Convert to SQL/filter against comparison matrix
4. **RAG augmentation**: Retrieve relevant policy chunks for context
5. **Response generation**: LLM generates answer with citations to specific policies

---

## 8. Open-Source Tools and Resources

### 8.1 Healthcare NLP Libraries

| Tool | Language | Focus | License | Status (2026) |
|---|---|---|---|---|
| [MedSpaCy](https://github.com/medspacy/medspacy) | Python | Clinical NLP (sections, context, NER) | MIT | Active (v1.x) |
| [scispaCy](https://allenai.github.io/scispacy/) | Python | Biomedical NER, entity linking | MIT | Maintenance (v0.5.4) |
| [Med7](https://github.com/kormilitzin/med7) | Python | Medication entity extraction | MIT | Stable, limited updates |
| [OHNLP/MedTagger](https://github.com/OHNLP) | Java | Clinical NLP on Apache UIMA | Apache 2.0 | Active |
| [Stanza (Stanford)](https://stanfordnlp.github.io/stanza/) | Python | Biomedical/clinical NER | Apache 2.0 | Active |
| [BioBERT](https://github.com/dmis-lab/biobert) | Python | Biomedical language model | Apache 2.0 | Stable (v1.1) |
| [ClinicalBERT](https://huggingface.co/emilyalsentzer/Bio_ClinicalBERT) | Python | Clinical note understanding | MIT | Superseded by GatorTron |
| [GatorTron](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/clara/models/gatortron_og) | Python | Large-scale clinical LM (8.9B) | Custom | Active |

### 8.2 Document Processing

| Tool | Focus | Stars | Notes |
|---|---|---|---|
| [Docling](https://github.com/docling-project/docling) | PDF/document parsing | 57k+ | Best table extraction, broadest format support, VLM support |
| [Marker](https://github.com/datalab-to/marker) | PDF to Markdown/JSON | 33k+ | Best pure PDF-to-markdown quality, block-mode OCR |
| [Unstructured](https://github.com/Unstructured-IO/unstructured) | Multi-format parsing | 14k+ | Unified API, NLTK→spaCy migration (CVE fix) |
| [Surya](https://github.com/datalab-to/surya) | OCR engine (90+ langs) | 19k+ | Powers Marker, multi-token inference |

### 8.3 Medical Coding and Terminology

| Resource | Access | Description |
|---|---|---|
| [RxNav API](https://lhncbc.nlm.nih.gov/RxNav/) | Free (UMLS API key required) | Drug name normalization, RxCUI lookup |
| [UMLS](https://www.nlm.nih.gov/research/umls/) | Free (license required) | Unified terminology (ICD, SNOMED, RxNorm, LOINC) — 2025AA release |
| [I-MAGIC](https://imagic.nlm.nih.gov/) | Free | Interactive SNOMED-to-ICD-10 mapping |
| [Tuva Project](https://thetuvaproject.com/) | Open source | Healthcare data infrastructure, SNOMED-ICD-10 map |
| [CQL Engine](https://github.com/cqframework/clinical_quality_language) | Open source | Clinical criteria execution engine |
| [HAPI FHIR](https://hapifhir.io/) | Open source | Java FHIR server with terminology services |

### 8.4 Relevant GitHub Projects

| Project | Description |
|---|---|
| [nlp-annotator](https://github.com/kmikitin/nlp-annotator) | Annotation tool for medical policies using spaCy NER |
| [mrfparse](https://github.com/danielchalef/mrfparse) | Parser for CMS Transparency in Coverage MRF files (CPT/HCPCS) |
| [medicare-mcp](https://github.com/openpharma-org/medicare-mcp) | MCP server for CMS Medicare data with formulary tracking |
| [awesome-healthcare](https://github.com/kakoni/awesome-healthcare) | Curated list of open-source healthcare software |
| [awesome-medical-coding-NLP](https://github.com/acadTags/Awesome-medical-coding-NLP) | Papers on automated medical coding |
| [medical-data-extraction](https://github.com/abhijeetk597/medical-data-extraction) | OCR for patient/prescription data extraction |

### 8.5 Commercial Solutions (For Reference)

| Product | Approach |
|---|---|
| Availity AuthAI | CQL + AI for policy-aligned PA recommendations |
| Agadia CriteriaBuilder | Transforms policy PDFs into structured decision trees |
| Myndshft | GenAI for medical/pharmacy prior authorization |
| John Snow Labs v5.x | Enterprise clinical NLP with 700+ pre-trained healthcare models |
| Amazon Comprehend Medical | HIPAA-eligible cloud NER for medical text (stable, limited new investment) |

---

## 9. CMS Interoperability & Regulatory Landscape (2026)

### 9.1 CMS-0057-F: Prior Authorization Interoperability Final Rule

Published January 2024. Affects Medicare Advantage, Medicaid, CHIP, QHP issuers on FFE.

**Milestones:**

| Deadline | Requirement | Status (Apr 2026) |
|---|---|---|
| **January 1, 2026** | Prior Authorization API (FHIR-based, Da Vinci PAS IG) | **In effect** — payers should have live APIs |
| **January 1, 2026** | Provider Directory API updates | **In effect** |
| **January 1, 2026** | Decision timeframes: 72h urgent, 7 calendar days standard | **In effect** |
| **January 1, 2026** | Reason for denial with specific code required | **In effect** |
| **January 1, 2027** | Prior Authorization Metrics reporting (approval/denial rates, time-to-decision, appeal overturn rates — publicly reported) | Upcoming |
| **January 1, 2027** | Electronic Prior Auth for drugs (Part D) | Upcoming |

> **Note:** Real-world compliance may be uneven. Building systems that can consume FHIR-based PA APIs provides a competitive advantage for integration.

### 9.2 Related CMS Rules

- **CMS-9115-F** (original interoperability rule, 2020): Patient Access API requirements remain in effect
- Payers must send prior auth decisions as structured FHIR data
- All FHIR APIs must use Da Vinci implementation guides

---

## 10. Recommended Architecture Summary

```
                    +-------------------+
                    |  Policy Sources   |
                    | (PDF, HTML, APIs) |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Ingestion Layer  |
                    | Docling v2.85 +   |
                    | Marker v1.10 +    |
                    | Playwright scraper|
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Extraction Layer |
                    |  scispaCy + Med7  |
                    |  + LLM Structured |
                    |  Output (AI SDK)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Normalization    |
                    |  RxNorm + UMLS    |
                    |  (API key req'd)  |
                    |  + HCPCS/ICD-10   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v----------+      +-----------v--------+
     |  Structured Store  |      |  Vector Store      |
     |  PostgreSQL 16 +   |      |  pgvector 0.8 HNSW |
     |  policy schema     |      |  MedCPT / PubMed   |
     |                    |      |  BERT embeddings    |
     +--------+----------+      +-----------+--------+
              |                             |
              +--------------+--------------+
                             |
                    +--------v----------+
                    |  Query Layer      |
                    |  SQL + Vector     |
                    |  + LLM (RAG)     |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | Comparison |  | Policy Q&A  |  | Change      |
     | Matrix API |  | Chatbot     |  | Detection   |
     +------------+  +-------------+  +-------------+
```

### Technology Stack Recommendation (2026)

| Layer | Technology | Rationale |
|---|---|---|
| Document parsing | Docling v2.85 (primary) + Marker v1.10 (OCR fallback) | Best accuracy, broadest format support, MIT license |
| HTML rendering | Docling Playwright backend (v2.82+) | Native headless browser for JS-rendered payer pages |
| NER/NLP | scispaCy + Med7 + regex | Proven medical NER, no cloud dependency |
| LLM extraction | AI SDK v4.x + Gemini 2.5 Pro/Flash with structured output | Native JSON schema, best cost/accuracy ratio |
| LLM fallback | Claude Sonnet 4 via tool use | Excellent for ambiguous criteria, step therapy logic |
| Drug normalization | RxNorm API + UMLS (API key required) | Standard, free, comprehensive |
| Database | PostgreSQL 16 + pgvector 0.8 (HNSW) | Single database for structured + vector, parallel index builds |
| Embeddings | MedCPT 768-dim (medical retrieval) or PubMedBERT 768-dim (similarity) | Domain-specific accuracy, matching pgvector index config |
| Change detection | Document hash + JSON diff + semantic diff (cosine) | Multi-level change tracking |
| API framework | Next.js 16 API routes + FastAPI (BFF) | TypeScript frontend, Python ML backend |
| Frontend | Next.js 16 + React 19 | Comparison views, search UI |
| FHIR compliance | Da Vinci PAS/CRD/DTR IGs on FHIR R4 | CMS-0057-F mandate (live since Jan 2026) |
