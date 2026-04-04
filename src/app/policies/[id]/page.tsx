import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {policy.title}
          </h1>
          <Badge
            variant={policy.status === 'active' ? 'default' : 'secondary'}
          >
            {policy.status}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{policy.payerName}</span>
          <span>/</span>
          <span>{policy.planName}</span>
          <span className="text-xs">({policy.lineOfBusiness})</span>
          <span className="font-mono">#{policy.policyNumber}</span>
          <span>Effective: {policy.effectiveDate}</span>
          {policy.version && (
            <Badge variant="outline" className="font-mono text-xs">
              v{policy.version}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Extracted Claims ({claims.length})
        </h2>
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">
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
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <PolicyDetail id={id} />
    </Suspense>
  );
}
