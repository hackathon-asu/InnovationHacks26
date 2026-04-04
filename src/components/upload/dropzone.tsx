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
    if (file?.type === 'application/pdf') {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-colors ${
          dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-[#d8d8d4] bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm font-medium text-[#1a1a1a]">
            {dragOver ? 'Drop PDF here' : 'Drag & drop a policy PDF'}
          </p>
          <p className="text-xs text-[#8b8b8b] mt-1">or click to browse</p>
        </div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-2xl border border-[#e8e8e4] bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-mono font-medium">
              PDF
            </span>
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">{selectedFile.name}</p>
              <p className="text-xs text-[#8b8b8b]">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpload(selectedFile)}
            disabled={isUploading}
            className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50 transition-colors"
          >
            {isUploading ? 'Processing...' : 'Upload & Extract'}
          </button>
        </div>
      )}
    </div>
  );
}
