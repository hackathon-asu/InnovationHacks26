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

      const res = await fetch('/api/policies/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Upload failed');
      }

      const data = await res.json();
      setJobId(data.jobId ?? data.policy_id);
      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl pt-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Upload Policy</h1>
        <p className="text-sm text-[#8b8b8b] mt-1">
          Upload a medical policy PDF to extract and analyze coverage data.
        </p>
      </div>

      <Dropzone onUpload={handleUpload} isUploading={status === 'uploading'} />

      {status === 'uploading' && (
        <div className="rounded-2xl border border-[#e8e8e4] bg-white p-4 flex items-center gap-3">
          <span className="animate-pulse text-sm text-[#6b6b6b]">
            Extracting policy data...
          </span>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
            Processing
          </span>
        </div>
      )}

      {status === 'complete' && jobId && (
        <div className="rounded-2xl border border-[#e8e8e4] bg-white p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
              Complete
            </span>
            <span className="text-sm font-medium text-[#1a1a1a]">
              Policy extracted successfully
            </span>
          </div>
          <p className="text-xs text-[#8b8b8b] font-mono">ID: {jobId}</p>
        </div>
      )}

      {status === 'error' && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
