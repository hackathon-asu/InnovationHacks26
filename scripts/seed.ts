/**
 * Seed script: populates the database with policy data from /data PDFs.
 *
 * Pipeline:
 *   1. Read PDFs from /data/{payer}/ directories
 *   2. Extract text with pdf-parse
 *   3. Split into sections (~2000 token chunks)
 *   4. Extract structured claims via Gemini 2.5 Flash
 *   5. Normalize drugs via RxNorm API
 *   6. Generate embeddings with gemini-embedding-001
 *   7. Write to Postgres via Drizzle
 *
 * Usage: npm run db:seed
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import pdf from 'pdf-parse';
import * as schema from '../src/lib/db/schema';
import { extractPolicyClaims } from '../src/lib/ai/extraction';
import { normalizeToRxCUI } from '../src/lib/rxnorm/normalize';
import { generateEmbedding } from '../src/lib/ai/embeddings';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const PAYER_CONFIGS: Record<string, { name: string; websiteUrl: string }> = {
  uhc: { name: 'UnitedHealthcare', websiteUrl: 'https://www.uhc.com' },
  aetna: { name: 'Aetna', websiteUrl: 'https://www.aetna.com' },
  anthem: { name: 'Anthem Blue Cross', websiteUrl: 'https://www.anthem.com' },
  cigna: { name: 'Cigna', websiteUrl: 'https://www.cigna.com' },
  humana: { name: 'Humana', websiteUrl: 'https://www.humana.com' },
};

function splitIntoSections(text: string, maxTokens = 2000): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const sections: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    // Rough token estimate: ~4 chars per token
    if ((current.length + para.length) / 4 > maxTokens && current.length > 0) {
      sections.push(current.trim());
      current = '';
    }
    current += para + '\n\n';
  }

  if (current.trim()) {
    sections.push(current.trim());
  }

  return sections;
}

async function seedPayer(payerDir: string, payerKey: string) {
  const config = PAYER_CONFIGS[payerKey];
  if (!config) {
    console.log(`  Skipping unknown payer: ${payerKey}`);
    return;
  }

  // Upsert payer
  const [payer] = await db
    .insert(schema.payers)
    .values({ name: config.name, websiteUrl: config.websiteUrl })
    .onConflictDoNothing()
    .returning();

  const payerId = payer?.id;
  if (!payerId) {
    console.log(`  Payer ${config.name} already exists, fetching...`);
    // Would need a select here in production
    return;
  }

  // Create a default plan for this payer
  const [plan] = await db
    .insert(schema.plans)
    .values({
      payerId,
      name: `${config.name} Commercial PPO`,
      lineOfBusiness: 'Commercial',
      productType: 'PPO',
    })
    .returning();

  // Read PDFs
  let files: string[];
  try {
    files = (await readdir(payerDir)).filter((f) => f.endsWith('.pdf'));
  } catch {
    console.log(`  No PDF directory found for ${payerKey}`);
    return;
  }

  for (const file of files) {
    console.log(`  Processing: ${file}`);
    const pdfPath = join(payerDir, file);
    const buffer = await readFile(pdfPath);
    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    // Create policy record
    const [policy] = await db
      .insert(schema.policies)
      .values({
        planId: plan.id,
        policyNumber: file.replace('.pdf', ''),
        title: `${config.name} Policy - ${file.replace('.pdf', '')}`,
        effectiveDate: '2026-01-01',
        status: 'active',
        rawText: text,
      })
      .returning();

    // Split into sections and extract
    const sections = splitIntoSections(text);
    console.log(`    ${sections.length} sections to process`);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      console.log(`    Section ${i + 1}/${sections.length}`);

      try {
        // Extract structured claims
        const extraction = await extractPolicyClaims(section);

        if (extraction?.claims) {
          for (const claim of extraction.claims) {
            // Normalize drug via RxNorm
            const drugName = claim.drugBrandName ?? claim.drugGenericName;
            let rxcui: string | null = null;
            let brandName = claim.drugBrandName ?? null;
            let genericName = claim.drugGenericName ?? null;

            if (drugName) {
              try {
                const normalized = await normalizeToRxCUI(drugName);
                rxcui = normalized.rxcui;
                brandName = normalized.brandName ?? brandName;
                genericName = normalized.genericName ?? genericName;
              } catch (err) {
                console.log(`    RxNorm lookup failed for ${drugName}:`, err);
              }
            }

            await db.insert(schema.policyClaims).values({
              policyId: policy.id,
              drugBrandName: brandName,
              drugGenericName: genericName,
              rxcui,
              jCode: claim.jCode ?? null,
              coverageStatus: claim.coverageStatus,
              priorAuthRequired: claim.priorAuthRequired,
              extractedData: claim.extractedData,
              sourceExcerpt: claim.sourceExcerpt,
              sourcePage: claim.sourcePage ?? null,
              sourceSection: claim.sourceSection ?? null,
              confidence: claim.confidence,
            });
          }
        }

        // Generate embedding for RAG
        const embedding = await generateEmbedding(section);
        await db.insert(schema.policyChunks).values({
          policyId: policy.id,
          chunkIndex: i,
          chunkText: section,
          sectionType: 'general',
          embedding,
          metadata: { payerName: config.name, planName: plan.name },
        });
      } catch (err) {
        console.error(`    Error processing section ${i + 1}:`, err);
      }
    }

    console.log(`  Done: ${file}`);
  }
}

async function main() {
  console.log('Starting seed...');
  const dataDir = join(process.cwd(), 'data');

  let payerDirs: string[];
  try {
    payerDirs = await readdir(dataDir);
  } catch {
    console.log('No data/ directory found. Create data/{payer}/ with PDFs to seed.');
    return;
  }

  for (const payerKey of payerDirs) {
    const payerDir = join(dataDir, payerKey);
    console.log(`\nSeeding: ${payerKey}`);
    await seedPayer(payerDir, payerKey);
  }

  console.log('\nSeed complete.');
}

main().catch(console.error);
