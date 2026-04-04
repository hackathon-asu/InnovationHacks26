import { db } from '@/lib/db';
import { policies, plans, payers } from '@/lib/db/schema';
import { eq, ilike, and, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status') ?? 'active';
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const conditions = [eq(policies.status, status)];

  if (search) {
    conditions.push(ilike(policies.title, `%${search}%`));
  }

  const results = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      title: policies.title,
      effectiveDate: policies.effectiveDate,
      version: policies.version,
      status: policies.status,
      planName: plans.name,
      lineOfBusiness: plans.lineOfBusiness,
      payerName: payers.name,
    })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(payers, eq(plans.payerId, payers.id))
    .where(and(...conditions))
    .orderBy(desc(policies.effectiveDate))
    .limit(limit)
    .offset(offset);

  return Response.json({ policies: results });
}
