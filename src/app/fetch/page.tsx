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

export default function FetchPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [selectedPayers, setSelectedPayers] = useState<string[]>([]);
  const [drugName, setDrugName] = useState('');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [autoIngest, setAutoIngest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<FetchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<Set<number>>(new Set());
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

  function togglePayer(key: string) {
    setSelectedPayers((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  async function handleFetch() {
    if (!drugName.trim()) { setError('Enter a drug name'); return; }
    if (selectedPayers.length === 0) { setError('Select at least one payer'); return; }

    setLoading(true);
    setError(null);
    setResponse(null);
    setIngesting(new Set());
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

  async function handleIngest(result: ResultEntry, index: number) {
    if (!result.local_path || ingesting.has(index) || ingested.has(index)) return;

    setIngesting((prev) => new Set(prev).add(index));
    try {
      const res = await fetch('/api/fetch/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_path: result.local_path,
          payer: result.payer,
          filename: result.filename,
          provider,
          source_url: result.source_url,
          file_hash: result.file_hash,
          effective_date: result.effective_date,
        }),
      });
      const data = await res.json();
      if (res.ok && data.policy_id) {
        setIngested((prev) => new Set(prev).add(index));
        // Update the result with the policy_id
        if (response) {
          const updated = { ...response };
          updated.results[index].policy_id = data.policy_id;
          setResponse(updated);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIngesting((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  async function handleIngestAll() {
    if (!response) return;
    const eligible = response.results
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => r.is_new && !r.error && r.local_path && !ingested.has(i));

    for (const { r, i } of eligible) {
      await handleIngest(r, i);
    }
  }

  const done = response?.status === 'complete';
  const eligibleCount = response?.results.filter((r, i) => r.is_new && !r.error && r.local_path && !ingested.has(i)).length ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-[var(--font-montserrat)] dark:text-white">
          Fetch Latest Policies
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-2xl">
          Retrieve the newest policy documents from payer websites.
          Review fetched files, then choose which ones to send through the AI pipeline.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left — Input form */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm space-y-6">
          {/* Drug name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Drug name
            </label>
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="e.g. Rituxan, rituximab, Humira…"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-[#0F1117] px-4 py-2.5 text-sm dark:text-slate-200
                         placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#91BFEB] focus:outline-none focus:ring-2
                         focus:ring-[#91BFEB]/30 transition"
            />
          </div>

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
              LLM Provider (for ingestion)
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
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-[#0F1117] p-3 cursor-pointer hover:border-[#91BFEB] transition">
            <input
              type="checkbox"
              checked={autoIngest}
              onChange={(e) => setAutoIngest(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#91BFEB]"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-white">Auto-ingest new files</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Automatically start the AI pipeline for all new files. Uncheck to review first.</div>
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            onClick={handleFetch}
            disabled={loading}
            className="w-full rounded-xl bg-[#15173F] dark:bg-[#91BFEB] py-3 text-sm font-semibold text-white dark:text-[#15173F]
                       hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 dark:border-[#15173F]/30 border-t-white dark:border-t-[#15173F] animate-spin" />
                Fetching policies…
              </span>
            ) : (
              'Fetch latest policies'
            )}
          </button>
        </div>

        {/* Right — Results */}
        <div className="space-y-4">
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
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {response.drug_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {response.new_files} new{' '}
                      {response.new_files === 1 ? 'file' : 'files'} retrieved
                      {response.errors > 0 && ` · ${response.errors} error(s)`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      response.errors === 0
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    }`}
                  >
                    {response.errors === 0 ? 'All OK' : 'Partial'}
                  </span>
                </div>
              </div>

              {/* Ingest all button (only when not auto-ingesting) */}
              {!autoIngest && eligibleCount > 0 && (
                <button
                  onClick={handleIngestAll}
                  className="w-full rounded-xl bg-emerald-600 dark:bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Ingest all {eligibleCount} new {eligibleCount === 1 ? 'file' : 'files'}
                </button>
              )}

              {/* Per-payer result cards */}
              {response.results.map((r, i) => (
                <ResultCard
                  key={i}
                  result={r}
                  index={i}
                  autoIngest={autoIngest}
                  isIngesting={ingesting.has(i)}
                  isIngested={ingested.has(i)}
                  onIngest={() => handleIngest(r, i)}
                />
              ))}

              {/* Pipeline links */}
              {(response.policy_ids.length > 0 || ingested.size > 0) && (
                <div className="rounded-2xl border border-[#91BFEB]/40 bg-[#dceeff]/40 dark:bg-[#91BFEB]/10 p-4 text-sm">
                  <p className="font-semibold text-[#15173F] dark:text-white mb-2">
                    Ingestion pipeline started
                  </p>
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

function ResultCard({ result, index, autoIngest, isIngesting, isIngested, onIngest }: {
  result: ResultEntry;
  index: number;
  autoIngest: boolean;
  isIngesting: boolean;
  isIngested: boolean;
  onIngest: () => void;
}) {
  const isError = result.content_type === 'error';
  const isDedup = !result.is_new && !isError;
  const canIngest = result.is_new && !isError && result.local_path && !autoIngest && !isIngested;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isError
          ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
          : isDedup
          ? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
          : isIngested
          ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
          : 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{result.payer}</p>
          {result.filename && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{result.filename}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canIngest && (
            <button
              onClick={onIngest}
              disabled={isIngesting}
              className="shrink-0 rounded-lg bg-[#15173F] dark:bg-[#91BFEB] px-3 py-1 text-xs font-semibold text-white dark:text-[#15173F] hover:opacity-90 disabled:opacity-50 transition"
            >
              {isIngesting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-white/30 dark:border-[#15173F]/30 border-t-white dark:border-t-[#15173F] animate-spin" />
                  Ingesting…
                </span>
              ) : (
                'Ingest'
              )}
            </button>
          )}
          {isIngested && (
            <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Pipeline started
            </span>
          )}
          <StatusBadge result={result} />
        </div>
      </div>

      {/* Metadata row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {result.content_type !== 'error' && (
          <span>
            Type:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">{result.content_type}</span>
          </span>
        )}
        {result.effective_date && (
          <span>
            Effective: <span className="font-medium text-slate-700 dark:text-slate-300">{result.effective_date}</span>
          </span>
        )}
        {result.file_hash && (
          <span>
            Hash: <span className="font-mono text-slate-600 dark:text-slate-400">{result.file_hash.slice(0, 10)}…</span>
          </span>
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
          className="mt-2 block truncate text-xs text-[#91BFEB] hover:underline"
        >
          {result.source_url}
        </a>
      )}

      {/* Policy ID for ingestion tracking */}
      {result.policy_id && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Pipeline ID:{' '}
          <Link
            href="/policies"
            className="font-mono text-[#91BFEB] hover:underline"
          >
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
      <span className="shrink-0 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        Error
      </span>
    );
  }
  if (!result.is_new) {
    return (
      <span className="shrink-0 rounded-full bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
        Unchanged
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-green-100 dark:bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
      New
    </span>
  );
}
