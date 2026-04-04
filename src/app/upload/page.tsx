'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
      setJobId(data.jobId);
      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a medical policy PDF to extract and analyze coverage data.
        </p>
      </div>

      <Dropzone onUpload={handleUpload} isUploading={status === 'uploading'} />

      {status === 'uploading' && (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <span className="animate-pulse text-sm">
              Extracting policy data...
            </span>
            <Badge variant="secondary">Processing</Badge>
          </CardContent>
        </Card>
      )}

      {status === 'complete' && jobId && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--color-covered)]/15 text-[var(--color-covered)]">
                Complete
              </Badge>
              <span className="text-sm font-medium">
                Policy extracted successfully
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Job ID: {jobId}
            </p>
          </CardContent>
        </Card>
      )}

      {status === 'error' && error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
