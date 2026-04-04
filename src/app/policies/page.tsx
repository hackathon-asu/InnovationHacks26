import { Suspense } from 'react';
import { PolicyCard } from '@/components/policy/policy-card';
import { db } from '@/lib/db';
import { policies, plans, payers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function PolicyList() {
  const results = await db
    .select({ id: policies.id, policyNumber: policies.policyNumber, title: policies.title, effectiveDate: policies.effectiveDate, version: policies.version, status: policies.status, planName: plans.name, lineOfBusiness: plans.lineOfBusiness, payerName: payers.name })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(payers, eq(plans.payerId, payers.id))
    .orderBy(desc(policies.effectiveDate))
    .limit(50);

  if (results.length === 0) return <p className="text-sm text-slate-500 py-8 text-center">No policies found.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((p) => <PolicyCard key={p.id} {...p} />)}
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)]">Policies</h1>
        <p className="mt-1 text-sm text-slate-500">Browse medical policies by payer and plan.</p>
      </div>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}</div>}>
        <PolicyList />
      </Suspense>
    </main>
  );
}
