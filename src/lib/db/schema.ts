/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import {
  pgTable, uuid, text, boolean, integer, real,
  timestamp, date, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

// ---- Payers ----

export const payers = pgTable('payers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  websiteUrl: text('website_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- Plans ----

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  payerId: uuid('payer_id').references(() => payers.id).notNull(),
  name: text('name').notNull(),
  lineOfBusiness: text('line_of_business').notNull(),
  state: text('state'),
  productType: text('product_type'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- Policies ----

export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => plans.id).notNull(),
  policyNumber: text('policy_number').notNull(),
  title: text('title').notNull(),
  effectiveDate: date('effective_date').notNull(),
  lastReviewed: date('last_reviewed'),
  nextReviewDate: date('next_review_date'),
  version: integer('version').default(1),
  status: text('status').notNull().default('active'),
  sourceUrl: text('source_url'),
  sourceDocumentHash: text('source_document_hash'),
  rawText: text('raw_text'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  planStatusIdx: index('idx_policies_plan_status').on(table.planId, table.status),
  policyNumberIdx: uniqueIndex('idx_policies_unique').on(table.planId, table.policyNumber, table.effectiveDate),
}));

// ---- Policy Versions ----

export const policyVersions = pgTable('policy_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').references(() => policies.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  effectiveDate: date('effective_date').notNull(),
  changeSummary: text('change_summary'),
  diffJson: jsonb('diff_json'),
  sourceDocumentHash: text('source_document_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---- Policy Claims ----

export const policyClaims = pgTable('policy_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').references(() => policies.id).notNull(),
  drugBrandName: text('drug_brand_name'),
  drugGenericName: text('drug_generic_name'),
  rxcui: text('rxcui'),
  jCode: text('j_code'),
  coverageStatus: text('coverage_status'),
  priorAuthRequired: boolean('prior_auth_required'),
  extractedData: jsonb('extracted_data'),
  sourceExcerpt: text('source_excerpt'),
  sourcePage: integer('source_page'),
  sourceSection: text('source_section'),
  confidence: real('confidence'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  rxcuiIdx: index('idx_policy_claims_rxcui').on(table.rxcui),
  jCodeIdx: index('idx_policy_claims_jcode').on(table.jCode),
  policyIdx: index('idx_policy_claims_policy').on(table.policyId),
  brandNameIdx: index('idx_policy_claims_brand').on(table.drugBrandName),
}));

// ---- Policy Chunks (embeddings for RAG) ----

export const policyChunks = pgTable('policy_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  policyId: uuid('policy_id').references(() => policies.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  sectionType: text('section_type'),
  embedding: vector('embedding', { dimensions: 768 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  embeddingIdx: index('idx_policy_chunks_embedding')
    .using('ivfflat', table.embedding)
    .with({ lists: 100 }),
}));

// ---- Processing Jobs (P1 upload) ----

export const processingJobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  blobUrl: text('blob_url').notNull(),
  planId: uuid('plan_id').references(() => plans.id),
  status: text('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  policyId: uuid('policy_id').references(() => policies.id),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  statusIdx: index('idx_processing_jobs_status').on(table.status),
}));
