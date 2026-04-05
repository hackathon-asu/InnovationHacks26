'use client';

import { useState, useCallback } from 'react';

interface DropzoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function Dropzone({ onUpload, isUploading }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setSelectedFile(file);
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-[#91BFEB] bg-[#f5fbff] dark:bg-[#91BFEB]/5' : 'border-[#91BFEB] bg-[#f5fbff] dark:bg-[#91BFEB]/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-[#dceeff] dark:bg-[#91BFEB]/20" />
        <div className="text-lg font-semibold text-[#15173F] dark:text-white">
          {dragOver ? 'Drop PDF here' : 'Drag and drop policy PDFs here'}
        </div>
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Supports payer policy docs, updates, and versioned plan criteria</div>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-4 py-3">
          <div>
            <div className="font-medium text-slate-800 dark:text-white">{selectedFile.name}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">PDF • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <button
            onClick={() => onUpload(selectedFile)}
            disabled={isUploading}
            className="rounded-xl bg-[#91BFEB] px-4 py-2 text-sm font-semibold text-[#15173F] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isUploading ? 'Processing...' : 'Upload & Extract'}
          </button>
        </div>
      )}
    </div>
  );
}
