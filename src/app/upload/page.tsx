'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dropzone } from '@/components/upload/dropzone';

type Stage = { stage: string; status: string; message?: string | null };
type PipelineStatus = {
  policy_id: string;
  overall_status: string;
  progress_pct: number;
  stages: Stage[];
  error?: string | null;
};

export default function UploadPage() {
  const [provider, setProvider] = useState<'gemini' | 'ollama' | 'groq' | 'nvidia' | 'anthropic'>('ollama');
  const [uploading, setUploading] = useState(false);
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  function startPolling(id: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/policies/status/${id}`);
        if (!res.ok) return;
        const data: PipelineStatus = await res.json();
        setPipeline(data);
        if (data.overall_status === 'indexed' || data.overall_status === 'failed') {
          stopPolling();
        }
      } catch { /* retry next tick */ }
    }, 1500);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setPipeline(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/policies/upload?provider=${provider}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      const id = data.policy_id;
      setPolicyId(id);
      startPolling(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const done = pipeline?.overall_status === 'indexed';
  const failed = pipeline?.overall_status === 'failed';

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left — Upload */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Upload and ingest</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drop policy PDFs to extract drug rules and coverage criteria.</p>
          </div>

          {/* Model toggle */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">LLM Provider:</span>
            <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 p-0.5">
              {(['gemini', 'anthropic', 'nvidia', 'groq', 'ollama'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    provider === p
                      ? 'bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F] shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  {p === 'gemini' ? 'Gemini' : p === 'anthropic' ? 'Claude' : p === 'nvidia' ? 'NVIDIA' : p === 'groq' ? 'Groq' : 'Ollama'}
                </button>
              ))}
            </div>
          </div>

          <Dropzone onUpload={handleUpload} isUploading={uploading} />

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}
        </div>

        {/* Right — Pipeline status */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
          <h3 className="text-xl font-semibold font-[var(--font-montserrat)] dark:text-white">AI ingestion pipeline</h3>

          {/* Progress bar */}
          {pipeline && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>{done ? 'Complete' : failed ? 'Failed' : 'Processing...'}</span>
                <span className="font-mono">{pipeline.progress_pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    failed ? 'bg-red-400' : done ? 'bg-emerald-400' : 'bg-[#91BFEB]'
                  }`}
                  style={{ width: `${pipeline.progress_pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Stage list */}
          <div className="mt-5 space-y-3">
            {(pipeline?.stages ?? defaultStages).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <StageIcon status={s.status} index={i + 1} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${
                    s.status === 'done' ? 'text-slate-800 dark:text-slate-200' :
                    s.status === 'running' ? 'text-[#15173F] dark:text-[#91BFEB]' :
                    s.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-slate-400 dark:text-slate-500'
                  }`}>{s.stage}</div>
                  {s.status === 'error' && s.message && (
                    <div className="text-xs text-red-500 dark:text-red-400 mt-0.5 line-clamp-2">{s.message}</div>
                  )}
                </div>
                {s.status === 'running' && (
                  <div className="h-4 w-4 rounded-full border-2 border-[#91BFEB] border-t-transparent animate-spin" />
                )}
                {s.status === 'done' && (
                  <svg className="h-4 w-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
                {s.status === 'error' && (
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                )}
              </div>
            ))}
          </div>

          {done && policyId && (
            <a href={`/policies/${policyId}`} className="mt-5 block rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-4 py-2.5 text-center text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 transition-opacity">
              View extracted policy
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

const defaultStages: Stage[] = [
  { stage: 'Parse & OCR', status: 'pending' },
  { stage: 'Gemini extraction', status: 'pending' },
  { stage: 'Save to PostgreSQL', status: 'pending' },
  { stage: 'Chunk document', status: 'pending' },
  { stage: 'Embed chunks', status: 'pending' },
  { stage: 'Index in pgvector', status: 'pending' },
  { stage: 'Ready for RAG', status: 'pending' },
];

function StageIcon({ status, index }: { status: string; index: number }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold';
  if (status === 'done') return <div className={`${base} bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400`}>{index}</div>;
  if (status === 'running') return <div className={`${base} bg-[#dceeff] dark:bg-[#91BFEB]/20 text-[#15173F] dark:text-[#91BFEB]`}>{index}</div>;
  if (status === 'error') return <div className={`${base} bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400`}>{index}</div>;
  return <div className={`${base} bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500`}>{index}</div>;
}
