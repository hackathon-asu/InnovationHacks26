'use client';

import { CoverageMatrix } from '@/components/drug/coverage-matrix';
import { useComparison } from '@/hooks/use-comparison';
import { useParams } from 'next/navigation';

export default function DrugCoveragePage() {
  const params = useParams();
  const rxcui = params.rxcui as string;
  const { comparisons, isLoading } = useComparison(rxcui);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Coverage Matrix</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-mono">RxCUI: {rxcui}</p>
      </div>
      {isLoading ? (
        <div className="h-32 bg-white dark:bg-[#181A20] rounded-2xl animate-pulse" />
      ) : (
        <CoverageMatrix comparisons={comparisons} />
      )}
    </main>
  );
}
