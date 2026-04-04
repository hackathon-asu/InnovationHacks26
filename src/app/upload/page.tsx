'use client';

import { useState } from 'react';
import { Dropzone } from '@/components/upload/dropzone';

type UploadStatus = 'idle' | 'uploading' | 'complete' | 'error';

export default function UploadPage() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setStatus('uploading');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/policies/upload', { method: 'POST', body: formData });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? 'Upload failed'); }
      const data = await res.json();
      setJobId(data.jobId ?? data.policy_id);
      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold font-[var(--font-montserrat)]">Upload and ingest</h2>
            <p className="mt-1 text-sm text-slate-500">Drop policy PDFs to extract drug rules and coverage criteria.</p>
          </div>
          <Dropzone onUpload={handleUpload} isUploading={status === 'uploading'} />

          {status === 'complete' && jobId && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <div className="font-medium text-slate-800">Policy extracted successfully</div>
              <span className="rounded-full border border-[#91BFEB] bg-[#dceeff] px-3 py-1 text-xs font-semibold text-[#15173F]">Parsed</span>
            </div>
          )}
          {status === 'error' && error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold font-[var(--font-montserrat)]">AI ingestion pipeline</h3>
          <div className="mt-5 space-y-4">
            {[
              { n: 1, label: 'PDF text extracted (Docling)' },
              { n: 2, label: 'NLP entity extraction (scispaCy)' },
              { n: 3, label: 'Structured extraction (Gemini)' },
              { n: 4, label: 'Drug normalization (RxNorm)' },
              { n: 5, label: 'Embeddings + pgvector index' },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  step.n <= 3 ? 'bg-[#91BFEB] text-[#15173F]' : 'bg-[#15173F] text-white'
                }`}>
                  {step.n}
                </div>
                <div className="font-medium text-slate-700">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
