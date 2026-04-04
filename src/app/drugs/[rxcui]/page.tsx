import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CoverageMatrix } from '@/components/drug/coverage-matrix';
import { getDrugCoverage } from '@/lib/db/queries';
import type { ComparisonEntry } from '@/lib/types/comparison';

async function CoverageData({ rxcui }: { rxcui: string }) {
  const rows = await getDrugCoverage(rxcui);
  return <CoverageMatrix comparisons={rows as unknown as ComparisonEntry[]} />;
}

export default async function DrugCoveragePage({
  params,
}: {
  params: Promise<{ rxcui: string }>;
}) {
  const { rxcui } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Coverage Matrix
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          RxCUI: {rxcui}
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CoverageData rxcui={rxcui} />
      </Suspense>
    </div>
  );
}
