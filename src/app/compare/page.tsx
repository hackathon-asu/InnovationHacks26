'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoverageMatrix } from '@/components/drug/coverage-matrix';
import { useComparison } from '@/hooks/use-comparison';

interface DrugEntry {
  brandName: string | null;
  genericName: string | null;
  jCode: string | null;
  rxcui: string | null;
  drugClass: string | null;
  coverageStatus: string | null;
  priorAuth: boolean;
  planCount: number;
  payers: string[];
}

/* ── Drug class color mapping ──────────────────────────────────────────── */
const CLASS_COLORS: Record<string, { bg: string }> = {
  oncology:     { bg: 'bg-rose-500/10' },
  neurology:    { bg: 'bg-violet-500/10' },
  rheumatology: { bg: 'bg-sky-500/10' },
  immunology:   { bg: 'bg-teal-500/10' },
  default:      { bg: 'bg-slate-500/10' },
};

function getClassColor(drugClass: string | null) {
  if (!drugClass) return CLASS_COLORS.default;
  const lower = drugClass.toLowerCase();
  for (const [key, val] of Object.entries(CLASS_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return CLASS_COLORS.default;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialDrug = searchParams.get('drug') ?? '';

  const [drugName, setDrugName] = useState(initialDrug);
  const [activeDrug, setActiveDrug] = useState<string | null>(initialDrug || null);
  const { comparisons, isLoading } = useComparison(activeDrug);
  const [allDrugs, setAllDrugs] = useState<DrugEntry[]>([]);
  const [drugsLoading, setDrugsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/drugs/all')
      .then((r) => r.json())
      .then((data) => setAllDrugs(data.drugs ?? []))
      .catch(() => {})
      .finally(() => setDrugsLoading(false));
  }, []);

  const drugClasses = useMemo(() => {
    const classes = new Set<string>();
    allDrugs.forEach((d) => { if (d.drugClass) classes.add(d.drugClass); });
    return Array.from(classes).sort();
  }, [allDrugs]);

  const filteredDrugs = useMemo(() => {
    if (!filterClass) return allDrugs;
    return allDrugs.filter((d) => d.drugClass === filterClass);
  }, [allDrugs, filterClass]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (drugName.trim()) setActiveDrug(drugName.trim());
  }

  function selectDrug(name: string) {
    setDrugName(name);
    setActiveDrug(name);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-8 shadow-sm dark:shadow-2xl dark:shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold font-[var(--font-montserrat)] text-slate-900 dark:text-white">
              Drug Comparison
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Search any drug to see coverage requirements, prior auth, step therapy, and quantity limits side by side across all payers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:min-w-[320px]">
              <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] dark:focus:border-[#91BFEB]/50 focus:ring-1 focus:ring-[#91BFEB]/20 transition-all"
                placeholder="e.g. Rituxan, bevacizumab, J9035..."
              />
            </div>
            <button type="submit" className="rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-6 py-3.5 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#15173F]/20 dark:shadow-[#91BFEB]/20">
              Search
            </button>
          </form>
        </div>

        {/* Quick stats */}
        {!drugsLoading && allDrugs.length > 0 && !activeDrug && (
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

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-8">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#91BFEB] border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading coverage data for <span className="text-[#91BFEB] font-medium">&quot;{activeDrug}&quot;</span>...</p>
          </div>
        </div>
      )}

      {/* ── Comparison results ──────────────────────────────────────────── */}
      {activeDrug && !isLoading && comparisons.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold font-[var(--font-montserrat)] text-slate-900 dark:text-white">
                {activeDrug}
              </h3>
              <span className="rounded-full bg-[#91BFEB]/10 border border-[#91BFEB]/20 px-3 py-1 text-xs font-semibold text-[#91BFEB]">
                {comparisons.length} payer{comparisons.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => { setActiveDrug(null); setDrugName(''); }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              All drugs
            </button>
          </div>
          <CoverageMatrix comparisons={comparisons} />
        </div>
      )}

      {activeDrug && !isLoading && comparisons.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
            <svg className="h-7 w-7 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No coverage data found for <span className="text-slate-900 dark:text-white font-medium">&quot;{activeDrug}&quot;</span></p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try a different drug name, generic name, or J-code.</p>
          <button
            onClick={() => { setActiveDrug(null); setDrugName(''); }}
            className="mt-4 text-sm text-[#91BFEB] hover:underline"
          >
            Browse all drugs
          </button>
        </div>
      )}

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      {!activeDrug && !drugsLoading && drugClasses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterClass(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              filterClass === null
                ? 'bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F] shadow-md'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/[0.06]'
            }`}
          >
            All ({allDrugs.length})
          </button>
          {drugClasses.map((cls) => {
            const count = allDrugs.filter((d) => d.drugClass === cls).length;
            return (
              <button
                key={cls}
                onClick={() => setFilterClass(filterClass === cls ? null : cls)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  filterClass === cls
                    ? 'bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F] shadow-md'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/[0.06]'
                }`}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Drug grid ───────────────────────────────────────────────────── */}
      {!activeDrug && (
        <div className="space-y-4">
          {!drugsLoading && filteredDrugs.length > 0 && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold font-[var(--font-montserrat)] text-slate-900 dark:text-white">
                {filterClass ? filterClass : 'All Drugs'}
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{filteredDrugs.length} drugs</span>
            </div>
          )}

          {drugsLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-5 animate-pulse space-y-3">
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

          {!drugsLoading && allDrugs.length === 0 && (
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

          {!drugsLoading && filteredDrugs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDrugs.map((drug, i) => {
                const name = drug.brandName ?? drug.genericName ?? 'Unknown';
                const classColor = getClassColor(drug.drugClass);
                return (
                  <button
                    key={`${name}-${i}`}
                    onClick={() => selectDrug(name)}
                    className="group relative text-left rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-5 hover:border-[#91BFEB]/50 dark:hover:border-[#91BFEB]/30 transition-all duration-200 hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-[#91BFEB]/5 hover:-translate-y-0.5 overflow-hidden"
                  >
                    {/* Top accent line */}
                    <div className={`absolute top-0 inset-x-0 h-[2px] ${classColor.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate text-[15px] group-hover:text-[#15173F] dark:group-hover:text-[#91BFEB] transition-colors">{name}</p>
                        {drug.genericName && drug.brandName && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{drug.genericName}</p>
                        )}
                      </div>
                      <svg className="shrink-0 h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#91BFEB] transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      </svg>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {drug.jCode && (
                        <span className="rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300">
                          {drug.jCode}
                        </span>
                      )}
                      {drug.priorAuth && (
                        <span className="rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          PA
                        </span>
                      )}
                      {drug.coverageStatus === 'not_covered' && (
                        <span className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
                          Not Covered
                        </span>
                      )}
                      {drug.coverageStatus === 'covered' && (
                        <span className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Covered
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {drug.payers.slice(0, 3).map((_, pi) => (
                            <div key={pi} className="h-4 w-4 rounded-full bg-gradient-to-br from-slate-300 dark:from-slate-600 to-slate-400 dark:to-slate-700 border border-white dark:border-[#181A20] flex items-center justify-center">
                              <span className="text-[6px] text-white dark:text-slate-300 font-bold">{drug.payers[pi]?.charAt(0)}</span>
                            </div>
                          ))}
                          {drug.payers.length > 3 && (
                            <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-white/10 border border-white dark:border-[#181A20] flex items-center justify-center">
                              <span className="text-[6px] text-slate-500 dark:text-slate-400">+{drug.payers.length - 3}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}</span>
                      </div>
                      {drug.rxcui && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">RxCUI {drug.rxcui}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-8 animate-pulse">
          <div className="h-10 w-72 bg-slate-200 dark:bg-white/10 rounded-lg" />
          <div className="mt-3 h-4 w-96 bg-slate-100 dark:bg-white/5 rounded" />
        </div>
      </main>
    }>
      <CompareContent />
    </Suspense>
  );
}
