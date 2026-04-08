'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useEffect } from 'react';
import { Toast, useToast } from '@/components/ui/toast';

type Payer = { key: string; display: string; description: string; format: string };

const PROVIDER_OPTIONS = ['gemini', 'ollama', 'groq', 'nvidia', 'anthropic'] as const;
type Provider = (typeof PROVIDER_OPTIONS)[number];

const DISABLED_MSG = 'Auto-fetch is disabled — API costs have been cut since the hackathon ended (effective April 7, 2026).';

export default function FetchPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayers, setSelectedPayers] = useState<string[]>([]);
  const [drugName, setDrugName] = useState('');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [autoIngest, setAutoIngest] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    fetch('/api/fetch/payers')
      .then((r) => r.json())
      .then((d) => {
        setPayers(d.payers ?? []);
        setSelectedPayers((d.payers ?? []).map((p: Payer) => p.key));
      })
      .catch(() => {});
  }, []);

  function togglePayer(key: string) {
    setSelectedPayers((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function handleFetch() {
    showToast(DISABLED_MSG);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <Toast {...toast} />
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-8 shadow-sm dark:shadow-2xl dark:shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-[var(--font-montserrat)] text-slate-900 dark:text-white">
              Auto-Fetch Policies
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Retrieve policy documents from payer websites. Review what was fetched, select the files you want,
              then send them to the AI pipeline.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleFetch(); }} className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:min-w-[320px]">
              <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                placeholder="e.g. Rituxan, rituximab, Humira..."
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] dark:focus:border-[#91BFEB]/50 focus:ring-1 focus:ring-[#91BFEB]/20 transition-all"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-6 py-3.5 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#15173F]/20 dark:shadow-[#91BFEB]/20"
            >
              Fetch
            </button>
          </form>
        </div>

        <div className="mt-6 flex gap-6 border-t border-slate-100 dark:border-white/5 pt-5">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{payers.length}</p>
            <p className="text-xs text-slate-500">Payers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white font-[var(--font-montserrat)]">{selectedPayers.length}</p>
            <p className="text-xs text-slate-500">Selected</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left — Input form */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-6 shadow-sm space-y-6">
          {/* Payer selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Payers to retrieve from
            </label>
            <div className="space-y-2">
              {payers.map((p) => (
                <label
                  key={p.key}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-white/10 p-3 cursor-pointer
                             hover:border-[#91BFEB] transition bg-white dark:bg-[#0F1117]"
                >
                  <input
                    type="checkbox"
                    checked={selectedPayers.includes(p.key)}
                    onChange={() => togglePayer(p.key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#91BFEB]"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{p.display}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</div>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {p.format.toUpperCase()}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Provider selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              LLM Provider (for indexing)
            </label>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setProvider(opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    provider === opt
                      ? 'border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 text-[#15173F] dark:text-[#91BFEB]'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1117] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-ingest toggle */}
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1117] p-3 cursor-pointer hover:border-[#91BFEB] transition">
            <input
              type="checkbox"
              checked={autoIngest}
              onChange={(e) => setAutoIngest(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#91BFEB]"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-white">Auto-index new files</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Skip review — every new valid file goes straight into the AI pipeline after fetching.
                Leave unchecked to review and choose which files to send.
              </div>
            </div>
          </label>

          {/* Fetch button */}
          <button
            onClick={handleFetch}
            className="w-full rounded-xl border border-[#15173F] dark:border-[#91BFEB] py-2.5 text-sm font-semibold text-[#15173F] dark:text-[#91BFEB]
                       hover:bg-[#15173F]/5 dark:hover:bg-[#91BFEB]/10 transition"
          >
            Fetch policies
          </button>
        </div>

        {/* Right — Results placeholder */}
        <div className="space-y-3">
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#181A20] p-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Results will appear here after fetching.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
