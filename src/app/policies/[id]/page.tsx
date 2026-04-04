import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ClaimDetail } from '@/components/policy/claim-detail';
import { db } from '@/lib/db';
import { policies, plans, payers, policyClaims } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function PolicyDetail({ id }: { id: string }) {
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

  if (!policy) notFound();

  const claims = await db
    .select()
    .from(policyClaims)
    .where(eq(policyClaims.policyId, id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            {policy.title}
          </h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            policy.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f0f0ec] text-[#8b8b8b]'
          }`}>
            {policy.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b6b6b]">
          <span className="font-medium text-[#1a1a1a]">{policy.payerName}</span>
          <span>/</span>
          <span>{policy.planName}</span>
          <span className="text-xs text-[#8b8b8b]">({policy.lineOfBusiness})</span>
          <span className="font-mono text-[#8b8b8b]">#{policy.policyNumber}</span>
          <span>Effective: {policy.effectiveDate}</span>
          {policy.version && (
            <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs font-mono text-[#6b6b6b]">
              v{policy.version}
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-[#e8e8e4]" />

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-[#1a1a1a]">
          Extracted Claims ({claims.length})
        </h2>
        {claims.length === 0 ? (
          <p className="text-sm text-[#8b8b8b]">
            No claims extracted for this policy.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {claims.map((claim) => (
              <ClaimDetail key={claim.id} {...claim} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="pt-8">
      <Suspense fallback={<div className="h-96 bg-[#f4f4f0] rounded-2xl animate-pulse" />}>
        <PolicyDetail id={id} />
      </Suspense>
    </div>
  );
}
