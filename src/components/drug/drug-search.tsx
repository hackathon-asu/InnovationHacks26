'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDrugSearch } from '@/hooks/use-drug-search';

export function DrugSearch() {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useDrugSearch(query);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 max-w-lg">
        <input
          placeholder="Search drug name or J-code (e.g. Humira, J0135)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-4 py-3 text-sm dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] transition-colors"
        />
      </div>

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Searching...</p>}

      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((drug, i) => (
            <Link key={i} href={`/compare?drug=${encodeURIComponent(drug.brandName ?? drug.genericName ?? '')}`}>
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-4 hover:shadow-md transition-shadow space-y-2">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{drug.brandName ?? drug.genericName ?? 'Unknown'}</p>
                  {drug.genericName && drug.brandName && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{drug.genericName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {drug.jCode && (
                    <span className="rounded-full border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 px-2 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-400">{drug.jCode}</span>
                  )}
                  {drug.rxcui && (
                    <span className="rounded-full border border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 px-2 py-0.5 text-xs font-mono text-[#15173F] dark:text-[#91BFEB]">RxCUI: {drug.rxcui}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {query.length >= 2 && !isLoading && results.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No drugs found matching &quot;{query}&quot;.</p>
      )}
    </div>
  );
}
