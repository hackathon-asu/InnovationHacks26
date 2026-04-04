import { db } from '@/lib/db';
import { policies, plans, payers, policyClaims } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [policy] = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      title: policies.title,
      effectiveDate: policies.effectiveDate,
      version: policies.version,
      status: policies.status,
      sourceUrl: policies.sourceUrl,
      planName: plans.name,
      lineOfBusiness: plans.lineOfBusiness,
      payerName: payers.name,
    })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(payers, eq(plans.payerId, payers.id))
    .where(eq(policies.id, id))
    .limit(1);

  if (!policy) {
    return Response.json({ error: 'Policy not found' }, { status: 404 });
  }

  const claims = await db
    .select()
    .from(policyClaims)
    .where(eq(policyClaims.policyId, id));

  return Response.json({ policy, claims });
}
