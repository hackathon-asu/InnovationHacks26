import Link from 'next/link';

interface PolicyCardProps {
  id: string;
  filename: string;
  payer_name: string;
  effective_date: string | null;
  status: string;
  drug_count: number;
  llm_provider: string | null;
  created_at: string;
  updated_at: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  anthropic: 'Claude',
  nvidia: 'NVIDIA',
  groq: 'Groq',
  ollama: 'Ollama',
};

const STATUS_COLORS: Record<string, string> = {
  indexed: 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  failed: 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  pending: 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  parsing: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  nlp_extracting: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  gemini_extracting: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  rxnorm: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  saving_structured: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  chunking: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  embedding: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
  indexing: 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

const STATUS_LABELS: Record<string, string> = {
  indexed: 'Indexed',
  failed: 'Failed',
  pending: 'Pending',
  parsing: 'Parsing...',
  nlp_extracting: 'NLP...',
  gemini_extracting: 'Extracting...',
  rxnorm: 'RxNorm...',
  saving_structured: 'Saving...',
  chunking: 'Chunking...',
  embedding: 'Embedding...',
  indexing: 'Indexing...',
};

export function PolicyCard({ id, filename, payer_name, effective_date, status, drug_count, llm_provider, created_at, updated_at }: PolicyCardProps) {
  const isProcessing = !['indexed', 'failed', 'pending'].includes(status);
  const colorClass = STATUS_COLORS[status] ?? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <Link href={`/policies/${id}`}>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-5 hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-800 dark:text-white truncate">
            {payer_name || 'Unknown Payer'}
          </span>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
            {isProcessing && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />}
            {label}
          </span>
        </div>

        <p className="font-medium text-slate-700 dark:text-slate-300 leading-tight text-sm truncate" title={filename}>
          {filename}
        </p>

        <div className="flex flex-wrap gap-2">
          {drug_count > 0 && (
            <span className="rounded-full border border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 px-2 py-0.5 text-xs font-medium text-[#15173F] dark:text-[#91BFEB]">
              {drug_count} drug{drug_count !== 1 ? 's' : ''}
            </span>
          )}
          {effective_date && (
            <span className="rounded-full border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
              Eff. {effective_date}
            </span>
          )}
          {llm_provider && (
            <span className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-0.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              {PROVIDER_LABELS[llm_provider] ?? llm_provider}
            </span>
          )}
        </div>

        <div className="text-xs text-slate-400">
          Uploaded {new Date(created_at).toLocaleString()}
          {status === 'indexed' && updated_at && (
            <> &middot; Indexed {new Date(updated_at).toLocaleString()}</>
          )}
        </div>
      </div>
    </Link>
  );
}
