'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Payer = { key: string; display: string; description: string; format: string };

type ResultEntry = {
  payer: string;
  drug_name: string;
  source_url: string;
  content_type: string;
  filename: string;
  is_new: boolean;
  file_hash: string | null;
  effective_date: string | null;
  error: string | null;
  policy_id: string | null;
  local_path: string | null;
};

type FetchResponse = {
  drug_name: string;
  payers_requested: string[];
  results: ResultEntry[];
  policy_ids: string[];
  new_files: number;
  errors: number;
  status: string;
  error?: string;
};

const PROVIDER_OPTIONS = ['gemini', 'ollama', 'groq', 'nvidia', 'anthropic'] as const;
type Provider = (typeof PROVIDER_OPTIONS)[number];

function isSelectable(r: ResultEntry) {
  return r.content_type !== 'error' && !!r.local_path;
}

export default function FetchPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayers, setSelectedPayers] = useState<string[]>([]);
  const [drugName, setDrugName] = useState('');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [autoIngest, setAutoIngest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection model
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [ingested, setIngested] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/fetch/payers')
      .then((r) => r.json())
      .then((d) => {
        setPayers(d.payers ?? []);
        setSelectedPayers((d.payers ?? []).map((p: Payer) => p.key));
      })
      .catch(() => {});
  }, []);

  // Auto-select all valid results when a new fetch response arrives
  useEffect(() => {
    if (!response) return;
    const valid = new Set(
      response.results
        .map((r, i) => (isSelectable(r) ? i : -1))
        .filter((i) => i !== -1)
    );
    setSelectedIndices(valid);
    setIngested(new Set());
  }, [response]);

  function togglePayer(key: string) {
    setSelectedPayers((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function toggleSelect(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function selectAll() {
    if (!response) return;
    setSelectedIndices(
      new Set(
        response.results
          .map((r, i) => (isSelectable(r) && !ingested.has(i) ? i : -1))
          .filter((i) => i !== -1)
      )
    );
  }

  function selectNone() {
    setSelectedIndices(new Set());
  }

  async function handleFetch() {
    if (!drugName.trim()) { setError('Enter a drug name'); return; }
    if (selectedPayers.length === 0) { setError('Select at least one payer'); return; }

    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedIndices(new Set());
    setIngested(new Set());

    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug_name: drugName.trim(), payers: selectedPayers, provider, auto_ingest: autoIngest }),
      });
      const data: FetchResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Fetch failed');
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleIngestSelected() {
    if (!response || selectedIndices.size === 0 || ingesting) return;
    setIngesting(true);

    const toIngest = [...selectedIndices].filter(
      (i) => !ingested.has(i) && isSelectable(response.results[i])
    );

    await Promise.all(
      toIngest.map(async (i) => {
        const r = response.results[i];
        try {
          const res = await fetch('/api/fetch/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              local_path: r.local_path,
              payer: r.payer,
              filename: r.filename,
              provider,
              source_url: r.source_url,
              file_hash: r.file_hash,
              effective_date: r.effective_date,
            }),
          });
          const data = await res.json();
          if (res.ok && data.policy_id) {
            setIngested((prev) => new Set(prev).add(i));
            setResponse((prev) => {
              if (!prev) return prev;
              const updated = { ...prev, results: [...prev.results] };
              updated.results[i] = { ...updated.results[i], policy_id: data.policy_id };
              return updated;
            });
          }
        } catch {
          // silently fail per-item
        }
      })
    );

    setIngesting(false);
  }

  const done = response?.status === 'complete';
  const selectableCount = response?.results.filter((r, i) => isSelectable(r) && !ingested.has(i)).length ?? 0;
  const pendingSelected = [...selectedIndices].filter(
    (i) => response && isSelectable(response.results[i]) && !ingested.has(i)
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
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
              disabled={loading}
              className="rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-6 py-3.5 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-[#15173F]/20 dark:shadow-[#91BFEB]/20"
            >
              {loading ? 'Fetching...' : 'Fetch'}
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
          {response && (
            <>
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-[var(--font-montserrat)]">{response.new_files}</p>
                <p className="text-xs text-slate-500">New files</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400 font-[var(--font-montserrat)]">{response.errors}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left — Input form */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#181A20] p-6 shadow-sm space-y-6">
          {/* Drug name (shown smaller since main search is in header) */}

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

          {error && (
            <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Fetch button (secondary — main one is in hero header) */}
          <button
            onClick={handleFetch}
            disabled={loading}
            className="w-full rounded-xl border border-[#15173F] dark:border-[#91BFEB] py-2.5 text-sm font-semibold text-[#15173F] dark:text-[#91BFEB]
                       hover:bg-[#15173F]/5 dark:hover:bg-[#91BFEB]/10 disabled:opacity-50 transition"
          >
            {loading ? 'Fetching...' : 'Fetch policies'}
          </button>
        </div>

        {/* Right — Results */}
        <div className="space-y-3">
          {!response && !loading && (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#181A20] p-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Results will appear here after fetching.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-slate-200 dark:border-white/10 border-t-[#91BFEB] animate-spin" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Contacting payer websites…</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">This may take 10–30 seconds per payer</p>
            </div>
          )}

          {done && response && (
            <>
              {/* Summary banner */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{response.drug_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {response.new_files} new {response.new_files === 1 ? 'file' : 'files'} retrieved
                      {response.errors > 0 && ` · ${response.errors} error(s)`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    response.errors === 0
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {response.errors === 0 ? 'All OK' : 'Partial'}
                  </span>
                </div>
              </div>

              {/* Per-payer result cards */}
              {response.results.map((r, i) => (
                <ResultCard
                  key={i}
                  result={r}
                  index={i}
                  isSelected={selectedIndices.has(i)}
                  isIngested={ingested.has(i)}
                  onToggleSelect={() => toggleSelect(i)}
                />
              ))}

              {/* Selection action bar */}
              {!autoIngest && selectableCount > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <button onClick={selectAll} className="hover:text-[#91BFEB] transition">All</button>
                    <span>·</span>
                    <button onClick={selectNone} className="hover:text-[#91BFEB] transition">None</button>
                    <span className="text-slate-300 dark:text-white/20">|</span>
                    <span>{pendingSelected} selected</span>
                  </div>
                  <button
                    onClick={handleIngestSelected}
                    disabled={pendingSelected === 0 || ingesting}
                    className="rounded-lg bg-[#15173F] dark:bg-[#91BFEB] px-4 py-1.5 text-xs font-semibold text-white dark:text-[#15173F]
                               hover:opacity-90 disabled:opacity-40 transition"
                  >
                    {ingesting ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border-2 border-white/30 dark:border-[#15173F]/30 border-t-white dark:border-t-[#15173F] animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      `Send ${pendingSelected} to AI pipeline`
                    )}
                  </button>
                </div>
              )}

              {/* Pipeline links */}
              {(response.policy_ids.length > 0 || ingested.size > 0) && (
                <div className="rounded-2xl border border-[#91BFEB]/40 bg-[#dceeff]/40 dark:bg-[#91BFEB]/10 p-4 text-sm">
                  <p className="font-semibold text-[#15173F] dark:text-white mb-1">Ingestion pipeline started</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    {response.policy_ids.length + ingested.size}{' '}
                    {(response.policy_ids.length + ingested.size) === 1 ? 'policy is' : 'policies are'} now
                    processing through the 8-stage pipeline.
                  </p>
                  <Link
                    href="/policies"
                    className="inline-block rounded-lg bg-[#15173F] dark:bg-[#91BFEB] px-3 py-1.5 text-xs
                               font-medium text-white dark:text-[#15173F] hover:opacity-90 transition"
                  >
                    View pipeline status →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ResultCard({ result, index, isSelected, isIngested, onToggleSelect }: {
  result: ResultEntry;
  index: number;
  isSelected: boolean;
  isIngested: boolean;
  onToggleSelect: () => void;
}) {
  const isError = result.content_type === 'error';
  const isDedup = !result.is_new && !isError;
  const selectable = isSelectable(result) && !isIngested;

  return (
    <div
      onClick={selectable ? onToggleSelect : undefined}
      className={`rounded-2xl border p-4 transition ${
        isIngested
          ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
          : isError
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
          : isDedup
          ? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
          : isSelected
          ? 'border-[#91BFEB] bg-[#dceeff]/60 dark:bg-[#91BFEB]/10 cursor-pointer'
          : 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Checkbox — only for selectable, non-ingested results */}
          {selectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#91BFEB]"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{result.payer}</p>
            {result.filename && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{result.filename}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isIngested && (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Indexed
            </span>
          )}
          <StatusBadge result={result} />
        </div>
      </div>

      {/* Metadata row */}
      <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 ${selectable ? 'ml-6' : ''}`}>
        {result.content_type !== 'error' && (
          <span>Type: <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">{result.content_type}</span></span>
        )}
        {result.effective_date && (
          <span>Effective: <span className="font-medium text-slate-700 dark:text-slate-300">{result.effective_date}</span></span>
        )}
        {result.file_hash && (
          <span>Hash: <span className="font-mono text-slate-600 dark:text-slate-400">{result.file_hash.slice(0, 10)}…</span></span>
        )}
      </div>

      {/* Error message */}
      {isError && result.error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 rounded-lg px-2.5 py-1.5">
          {result.error}
        </p>
      )}

      {/* Source URL */}
      {result.source_url && !isError && (
        <a
          href={result.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`mt-2 block truncate text-xs text-[#91BFEB] hover:underline ${selectable ? 'ml-6' : ''}`}
        >
          {result.source_url}
        </a>
      )}

      {/* Policy ID */}
      {result.policy_id && (
        <p className={`mt-2 text-xs text-slate-500 dark:text-slate-400 ${selectable ? 'ml-6' : ''}`}>
          Pipeline ID:{' '}
          <Link href="/policies" className="font-mono text-[#91BFEB] hover:underline" onClick={(e) => e.stopPropagation()}>
            {result.policy_id.slice(0, 8)}…
          </Link>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ result }: { result: ResultEntry }) {
  if (result.content_type === 'error') {
    return (
      <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        Failed
      </span>
    );
  }
  if (!result.is_new) {
    return (
      <span className="rounded-full bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
        Unchanged
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 dark:bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
      New
    </span>
  );
}
