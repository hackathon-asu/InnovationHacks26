import { db } from '@/lib/db';
import { processingJobs, policies, plans, policyClaims } from '@/lib/db/schema';
import { extractTextFromBuffer } from '@/lib/pdf/extract';
import { extractPolicyClaims } from '@/lib/ai/extraction';
import { normalizeToRxCUI } from '@/lib/rxnorm/normalize';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.type !== 'application/pdf') {
    return Response.json({ error: 'PDF file required' }, { status: 400 });
  }

  // Get the first available plan as default
  const [defaultPlan] = await db.select().from(plans).limit(1);
  if (!defaultPlan) {
    return Response.json(
      { error: 'No plans exist. Run seed script first.' },
      { status: 400 },
    );
  }

  // Create processing job
  const [job] = await db
    .insert(processingJobs)
    .values({
      blobUrl: `upload://${file.name}`,
      planId: defaultPlan.id,
      status: 'extracting',
    })
    .returning();

  try {
    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer);

    // Create policy record
    const [policy] = await db
      .insert(policies)
      .values({
        planId: defaultPlan.id,
        policyNumber: file.name.replace('.pdf', ''),
        title: `Uploaded Policy - ${file.name.replace('.pdf', '')}`,
        effectiveDate: new Date().toISOString().split('T')[0],
        status: 'active',
        rawText: text,
      })
      .returning();

    // Split and extract claims
    const sections = text.split(/\n{2,}/).filter((s) => s.trim().length > 100);
    const chunkedSections: string[] = [];
    let current = '';

    for (const section of sections) {
      if ((current.length + section.length) / 4 > 2000 && current) {
        chunkedSections.push(current.trim());
        current = '';
      }
      current += section + '\n\n';
    }
    if (current.trim()) chunkedSections.push(current.trim());

    for (const section of chunkedSections) {
      try {
        const extraction = await extractPolicyClaims(section);
        if (extraction?.claims) {
          for (const claim of extraction.claims) {
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
              } catch { /* RxNorm optional */ }
            }

            await db.insert(policyClaims).values({
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
      } catch { /* continue on section failure */ }
    }

    // Update job status
    await db
      .update(processingJobs)
      .set({ status: 'complete', policyId: policy.id, completedAt: new Date() })
      .where(eq(processingJobs.id, job.id));

    return Response.json({ jobId: job.id, policyId: policy.id, status: 'complete' });
  } catch (err) {
    await db
      .update(processingJobs)
      .set({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      })
      .where(eq(processingJobs.id, job.id));

    return Response.json(
      { error: 'Extraction failed', jobId: job.id },
      { status: 500 },
    );
  }
}
