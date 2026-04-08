'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

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
      <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
          <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold font-[var(--font-montserrat)] text-amber-900 dark:text-amber-200">Uploads Disabled</h2>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300 max-w-md mx-auto">
          Uploads have been disabled since the hackathon demo period has ended. This feature is no longer available to prevent API abuse.
        </p>
        <a href="/chat" className="mt-5 inline-block rounded-xl bg-[#15173F] dark:bg-[#91BFEB] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#15173F] hover:opacity-90 transition-opacity">
          Try the demo chat instead
        </a>
      </div>
    </main>
  );
}

const defaultStages: Stage[] = [
  { stage: 'Parse & OCR', status: 'pending' },
  { stage: 'NLP extraction', status: 'pending' },
  { stage: 'LLM extraction', status: 'pending' },
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
