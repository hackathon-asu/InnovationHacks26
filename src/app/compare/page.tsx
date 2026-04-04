'use client';

import { useState } from 'react';
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
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Compare Plans</h1>
        <p className="text-sm text-[#8b8b8b] mt-1">
          Enter an RxCUI to compare coverage across all plans.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 max-w-lg">
        <input
          placeholder="Enter RxCUI (e.g. 352385 for adalimumab)"
          value={rxcui}
          onChange={(e) => setRxcui(e.target.value)}
          className="flex-1 rounded-xl border border-[#e8e8e4] bg-white px-4 py-2.5 text-sm font-mono text-[#1a1a1a] placeholder:text-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#333] transition-colors"
        >
          Compare
        </button>
      </form>

      {isLoading && (
        <p className="text-sm text-[#8b8b8b]">Loading coverage data...</p>
      )}

      {activeRxcui && !isLoading && (
        <CoverageMatrix comparisons={comparisons} />
      )}
    </div>
  );
}
