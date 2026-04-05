'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface DrugEntry {
  brandName: string | null;
  genericName: string | null;
  jCode: string | null;
  rxcui: string | null;
  drugClass: string | null;
  indication: string | null;
  coverageStatus: string | null;
  priorAuth: boolean;
  planCount: number;
  payers: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  covered: { bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', label: 'Covered' },
  prior_auth: { bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', label: 'Prior Auth' },
  not_covered: { bg: 'bg-red-100 dark:bg-red-500/15', text: 'text-red-700 dark:text-red-400', label: 'Not Covered' },
  conditional: { bg: 'bg-blue-100 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', label: 'Conditional' },
};

export function DrugSearch() {
  const [query, setQuery] = useState('');
  const [allDrugs, setAllDrugs] = useState<DrugEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/drugs/all')
      .then((r) => r.json())
      .then((data) => setAllDrugs(data.drugs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allDrugs;
    const q = query.toLowerCase();
    return allDrugs.filter(
      (d) =>
        (d.brandName ?? '').toLowerCase().includes(q) ||
        (d.genericName ?? '').toLowerCase().includes(q) ||
        (d.jCode ?? '').toLowerCase().includes(q) ||
        (d.drugClass ?? '').toLowerCase().includes(q)
    );
  }, [allDrugs, query]);

  const statusInfo = (s: string | null) => {
    if (!s) return { bg: 'bg-slate-100 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400', label: 'Unknown' };
    return STATUS_COLORS[s] ?? { bg: 'bg-slate-100 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400', label: s.replace(/_/g, ' ') };
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="max-w-xl">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Filter by drug name, J-code, or class..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] pl-10 pr-4 py-3 text-sm dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] transition-colors"
          />
          {allDrugs.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} of {allDrugs.length}
            </span>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-5 space-y-3 animate-pulse">
              <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-3 w-48 bg-slate-100 dark:bg-white/5 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-100 dark:bg-white/5 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 dark:bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && allDrugs.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">No drugs ingested yet. Upload or auto-fetch a policy to get started.</p>
        </div>
      )}

      {/* Drug cards grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drug, i) => {
            const key = (drug.brandName ?? drug.genericName ?? '') + i;
            const isExpanded = expanded === key;
            const st = statusInfo(drug.coverageStatus);

            return (
              <div
                key={key}
                className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] hover:border-[#91BFEB]/50 dark:hover:border-[#91BFEB]/30 transition-all duration-200 hover:shadow-lg dark:hover:shadow-[#91BFEB]/5 overflow-hidden"
              >
                {/* Main content — clickable to expand */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full text-left p-5 space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate text-base">
                        {drug.brandName ?? drug.genericName ?? 'Unknown'}
                      </h3>
                      {drug.genericName && drug.brandName && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{drug.genericName}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Drug class / indication */}
                  {(drug.drugClass || drug.indication) && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {drug.drugClass && <span className="font-medium">{drug.drugClass}</span>}
                      {drug.drugClass && drug.indication && ' — '}
                      {drug.indication}
                    </p>
                  )}

                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {drug.jCode && (
                      <span className="rounded-full border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 px-2 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                        {drug.jCode}
                      </span>
                    )}
                    {drug.rxcui && (
                      <span className="rounded-full border border-[#91BFEB]/40 bg-[#dceeff] dark:bg-[#91BFEB]/10 px-2 py-0.5 text-xs font-mono text-[#15173F] dark:text-[#91BFEB]">
                        RxCUI {drug.rxcui}
                      </span>
                    )}
                    {drug.priorAuth && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        PA Required
                      </span>
                    )}
                  </div>

                  {/* Payer count */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>{drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}</span>
                    <svg
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
                    {/* Payer list */}
                    {drug.payers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Payers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {drug.payers.map((payer) => (
                            <span key={payer} className="rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                              {payer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        href={`/compare?drug=${encodeURIComponent(drug.brandName ?? drug.genericName ?? '')}`}
                        className="flex-1 text-center rounded-lg bg-[#15173F] dark:bg-[#91BFEB]/15 text-white dark:text-[#91BFEB] px-3 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        Compare Across Payers
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No results for filter */}
      {!loading && allDrugs.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          No drugs matching &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
