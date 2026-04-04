'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { CoverageMatrix } from '@/components/drug/coverage-matrix';
import { useComparison } from '@/hooks/use-comparison';

export default function ComparePage() {
  const [rxcui, setRxcui] = useState('');
  const [activeRxcui, setActiveRxcui] = useState<string | null>(null);
  const { comparisons, isLoading } = useComparison(activeRxcui);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rxcui.trim()) setActiveRxcui(rxcui.trim());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter an RxCUI to compare coverage across all plans.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 max-w-lg">
        <Input
          placeholder="Enter RxCUI (e.g. 352385 for adalimumab)"
          value={rxcui}
          onChange={(e) => setRxcui(e.target.value)}
          className="font-mono"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Compare
        </button>
      </form>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading coverage data...</p>
      )}

      {activeRxcui && !isLoading && (
        <CoverageMatrix comparisons={comparisons} />
      )}
    </div>
  );
}
