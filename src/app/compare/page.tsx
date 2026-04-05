'use client';

import { useState } from 'react';
import { CoverageMatrix } from '@/components/drug/coverage-matrix';
import { useComparison } from '@/hooks/use-comparison';

export default function ComparePage() {
  const [drugName, setDrugName] = useState('');
  const [activeDrug, setActiveDrug] = useState<string | null>(null);
  const { comparisons, isLoading } = useComparison(activeDrug);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (drugName.trim()) setActiveDrug(drugName.trim());
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Drug comparison workspace</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search a drug and compare policy requirements side by side.</p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
            <input
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              className="min-w-[280px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1117] px-4 py-3 text-sm dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] transition-colors"
              placeholder="Enter drug name (e.g. bevacizumab, Avastin)"
            />
            <button type="submit" className="rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-5 py-3 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 transition-opacity">
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {['All payers', 'Commercial', 'Medicare', 'Covered only', 'Recent updates'].map((f, i) => (
            <span key={f} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
              i === 0 ? 'border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 text-[#15173F] dark:text-[#91BFEB] font-medium' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}>
              {f}
            </span>
          ))}
        </div>

        {isLoading && <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Loading coverage data...</p>}

        {activeDrug && !isLoading && (
          <div className="mt-6">
            <CoverageMatrix comparisons={comparisons} />
          </div>
        )}
      </div>
    </main>
  );
}
