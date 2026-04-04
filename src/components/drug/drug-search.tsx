'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDrugSearch } from '@/hooks/use-drug-search';

export function DrugSearch() {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useDrugSearch(query);

  return (
    <div className="space-y-4">
      <input
        placeholder="Search by drug name or J-code (e.g. Humira, J0135)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-lg rounded-xl border border-[#e8e8e4] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
      />

      {isLoading && (
        <p className="text-sm text-[#8b8b8b]">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((drug, i) => (
            <Link key={i} href={drug.rxcui ? `/drugs/${drug.rxcui}` : '#'}>
              <div className="rounded-2xl border border-[#e8e8e4] bg-white p-4 hover:border-emerald-300 hover:shadow-sm transition-all space-y-2">
                <div>
                  <p className="font-medium text-[#1a1a1a]">
                    {drug.brandName ?? drug.genericName ?? 'Unknown'}
                  </p>
                  {drug.genericName && drug.brandName && (
                    <p className="text-sm text-[#8b8b8b]">
                      {drug.genericName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {drug.jCode && (
                    <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs font-mono text-[#6b6b6b]">
                      {drug.jCode}
                    </span>
                  )}
                  {drug.rxcui && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-mono text-emerald-700">
                      RxCUI: {drug.rxcui}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8b8b8b]">
                  {drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {query.length >= 2 && !isLoading && results.length === 0 && (
        <p className="text-sm text-[#8b8b8b]">
          No drugs found matching &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
