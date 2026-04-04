import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PolicyCard } from '@/components/policy/policy-card';
import { db } from '@/lib/db';
import { policies, plans, payers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function PolicyList() {
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
    .orderBy(desc(policies.effectiveDate))
    .limit(50);

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No policies found. Run the seed script to populate data.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((p) => (
        <PolicyCard key={p.id} {...p} />
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Policies</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse medical policies by payer and plan.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <PolicyList />
      </Suspense>
    </div>
  );
}
