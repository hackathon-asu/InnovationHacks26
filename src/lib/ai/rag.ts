/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { db } from '@/lib/db';
import { policyChunks } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { generateEmbedding } from './embeddings';

export async function retrieveChunks(query: string, limit = 5) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await db
    .select({
      chunkText: policyChunks.chunkText,
      sectionType: policyChunks.sectionType,
      metadata: policyChunks.metadata,
      similarity: sql<number>`1 - (${policyChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(policyChunks)
    .orderBy(sql`${policyChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit);

  return results;
}
