/**
 * Seed script: processes PDFs from /data and populates the database.
 *
 * Usage: npm run db:seed
 *
 * Pipeline:
 *   1. Read PDFs from /data/{payer}/ directories
 *   2. Extract text with pdf-parse
 *   3. Split into sections
 *   4. Extract structured claims via Gemini 2.5 Flash
 *   5. Normalize drugs via RxNorm API
 *   6. Write to Postgres via Drizzle
 */

// TODO: Implement seeding pipeline
// See docs/architecture.md §4 for full data flow specification

console.log('Seed script placeholder — implement in Phase 3');
