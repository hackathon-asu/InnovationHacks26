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
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold font-[var(--font-montserrat)]">Drug comparison workspace</h2>
            <p className="mt-1 text-sm text-slate-500">Search a drug and compare policy requirements side by side.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
            <input
              value={rxcui}
              onChange={(e) => setRxcui(e.target.value)}
              className="min-w-[280px] rounded-xl border border-slate-200 px-4 py-3 outline-none placeholder:text-slate-400 focus:border-[#91BFEB] transition-colors"
              placeholder="Search drug name or RxCUI"
            />
            <button type="submit" className="rounded-xl bg-[#15173F] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {['All payers', 'Commercial', 'Medicare', 'Covered only', 'Recent updates'].map((f, i) => (
            <span key={f} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
              i === 0 ? 'border-[#91BFEB] bg-[#dceeff] text-[#15173F] font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
              {f}
            </span>
          ))}
        </div>

        {isLoading && <p className="mt-6 text-sm text-slate-500">Loading coverage data...</p>}

        {activeRxcui && !isLoading && (
          <div className="mt-6">
            <CoverageMatrix comparisons={comparisons} />
          </div>
        )}
      </div>
    </main>
  );
}
