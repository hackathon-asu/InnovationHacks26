'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
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

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  covered:              { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Covered' },
  covered_with_criteria:{ bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-500/20',     label: 'Conditional' },
  prior_auth:           { bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-500/20',     label: 'Prior Auth' },
  not_covered:          { bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-700 dark:text-red-400',         border: 'border-red-200 dark:border-red-500/20',         label: 'Not Covered' },
  conditional:          { bg: 'bg-sky-50 dark:bg-sky-500/10',         text: 'text-sky-700 dark:text-sky-400',         border: 'border-sky-200 dark:border-sky-500/20',         label: 'Conditional' },
};

const FALLBACK_STATUS = { bg: 'bg-slate-50 dark:bg-white/5', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-200 dark:border-white/10', label: 'Unknown' };

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
    if (!s) return FALLBACK_STATUS;
    return STATUS_COLORS[s] ?? { ...FALLBACK_STATUS, label: s.replace(/_/g, ' ') };
  };

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-8 shadow-sm dark:shadow-2xl dark:shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold font-[var(--font-montserrat)] text-slate-900 dark:text-white">
              Drug Coverage
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              All extracted drugs across ingested policies. Click a card for details or compare across payers.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-auto lg:min-w-[340px]">
            <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Filter by drug name, J-code, or class..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-11 pr-20 py-3.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] dark:focus:border-[#91BFEB]/50 focus:ring-1 focus:ring-[#91BFEB]/20 transition-all"
            />
            {allDrugs.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} of {allDrugs.length}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        {!loading && allDrugs.length > 0 && (
          <div className="mt-6 flex gap-6 border-t border-slate-100 dark:border-white/5 pt-5">
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{allDrugs.length}</p>
              <p className="text-xs text-slate-500">Drugs tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{allDrugs.filter(d => d.priorAuth).length}</p>
              <p className="text-xs text-slate-500">Require PA</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{new Set(allDrugs.flatMap(d => d.payers)).size}</p>
              <p className="text-xs text-slate-500">Payers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{allDrugs.filter(d => d.jCode).length}</p>
              <p className="text-xs text-slate-500">With J-codes</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-5 space-y-3 animate-pulse">
              <div className="h-5 w-28 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="h-3 w-36 bg-slate-100 dark:bg-white/5 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-slate-100 dark:bg-white/5 rounded-full" />
                <div className="h-5 w-10 bg-slate-100 dark:bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && allDrugs.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
            <svg className="h-7 w-7 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No drugs ingested yet.</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Upload or auto-fetch a policy to get started.</p>
        </div>
      )}

      {/* ── Drug cards grid ─────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drug, i) => {
            const key = (drug.brandName ?? drug.genericName ?? '') + i;
            const isExpanded = expanded === key;
            const st = statusInfo(drug.coverageStatus);
            const name = drug.brandName ?? drug.genericName ?? 'Unknown';

            return (
              <div
                key={key}
                className="group rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] hover:border-[#91BFEB]/50 dark:hover:border-[#91BFEB]/30 transition-all duration-200 hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-[#91BFEB]/5 hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Main content */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : key)}
                  className="w-full text-left p-5 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate text-[15px] group-hover:text-[#15173F] dark:group-hover:text-[#91BFEB] transition-colors">
                        {name}
                      </h3>
                      {drug.genericName && drug.brandName && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{drug.genericName}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-md ${st.bg} ${st.text} border ${st.border} px-2 py-0.5 text-[11px] font-semibold`}>
                      {st.label}
                    </span>
                  </div>

                  {/* Drug class / indication */}
                  {(drug.drugClass || drug.indication) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                      {drug.drugClass && <span className="font-medium text-slate-500 dark:text-slate-400">{drug.drugClass}</span>}
                      {drug.drugClass && drug.indication && ' — '}
                      {drug.indication}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {drug.jCode && (
                      <span className="rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300">
                        {drug.jCode}
                      </span>
                    )}
                    {drug.rxcui && (
                      <span className="rounded-md bg-[#dceeff] dark:bg-[#91BFEB]/10 border border-[#91BFEB]/30 dark:border-[#91BFEB]/20 px-2 py-0.5 text-[11px] font-mono text-[#15173F] dark:text-[#91BFEB]">
                        RxCUI {drug.rxcui}
                      </span>
                    )}
                    {drug.priorAuth && (
                      <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        PA
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {drug.payers.slice(0, 3).map((p, pi) => (
                          <div key={pi} className="h-4 w-4 rounded-full bg-gradient-to-br from-slate-300 dark:from-slate-600 to-slate-400 dark:to-slate-700 border border-white dark:border-[#181A20] flex items-center justify-center">
                            <span className="text-[6px] text-white dark:text-slate-300 font-bold">{p.charAt(0)}</span>
                          </div>
                        ))}
                        {drug.payers.length > 3 && (
                          <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-white/10 border border-white dark:border-[#181A20] flex items-center justify-center">
                            <span className="text-[6px] text-slate-500 dark:text-slate-400">+{drug.payers.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <span>{drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}</span>
                    </div>
                    <svg
                      className={`h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#91BFEB] transition-all ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
                    {drug.payers.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Payers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {drug.payers.map((payer) => (
                            <span key={payer} className="rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                              {payer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/compare?drug=${encodeURIComponent(drug.brandName ?? drug.genericName ?? '')}`}
                      className="block w-full text-center rounded-lg bg-[#15173F] dark:bg-[#91BFEB]/15 text-white dark:text-[#91BFEB] px-3 py-2.5 text-xs font-semibold hover:opacity-90 dark:hover:bg-[#91BFEB]/25 transition-all"
                    >
                      Compare Across Payers
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No results for filter */}
      {!loading && allDrugs.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-12 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No drugs matching &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
