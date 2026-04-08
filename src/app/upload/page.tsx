'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState } from 'react';
import { Dropzone } from '@/components/upload/dropzone';
import { Toast, useToast } from '@/components/ui/toast';

type Stage = { stage: string; status: string; message?: string | null };

const DISABLED_MSG = 'Uploads are disabled — API costs have been cut since the hackathon ended (effective April 7, 2026).';

export default function UploadPage() {
  const [provider, setProvider] = useState<'gemini' | 'ollama' | 'groq' | 'nvidia' | 'anthropic'>('ollama');
  const { toast, showToast } = useToast();

  function handleUpload() {
    showToast(DISABLED_MSG);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Toast {...toast} />
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left — Upload */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Upload and ingest</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drop policy documents (PDF, DOCX, HTML, TXT) to extract drug rules and coverage criteria.</p>
          </div>

          {/* Model toggle */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">LLM Provider:</span>
            <div className="flex rounded-xl border border-slate-200 dark:border-white/10 bg-[#F0EDE8] dark:bg-white/5 p-0.5">
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

          <Dropzone onUpload={handleUpload} isUploading={false} />
        </div>

        {/* Right — Pipeline status */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
          <h3 className="text-xl font-semibold font-[var(--font-montserrat)] dark:text-white">AI ingestion pipeline</h3>

          {/* Stage list */}
          <div className="mt-5 space-y-3">
            {defaultStages.map((s, i) => (
              <div key={`${s.stage}-${i}`} className="flex items-center gap-3">
                <StageIcon status={s.status} index={i + 1} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-400 dark:text-slate-500">{s.stage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
