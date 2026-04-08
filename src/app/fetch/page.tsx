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
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
          <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold font-[var(--font-montserrat)] text-amber-900 dark:text-amber-200">Auto-Fetch Disabled</h2>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300 max-w-md mx-auto">
          Policy fetching and ingestion have been disabled since the hackathon demo period has ended. This feature is no longer available to prevent API abuse.
        </p>
        <a href="/chat" className="mt-5 inline-block rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 transition-opacity">
          Try the demo chat instead
        </a>
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
