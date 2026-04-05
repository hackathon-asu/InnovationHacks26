'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import type { ComparisonEntry } from '@/lib/types/comparison';

function coverageBadge(status: string | undefined) {
  switch (status) {
    case 'covered': return 'border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 text-[#15173F] dark:text-[#91BFEB]';
    case 'not_covered': return 'border-[#15173F] bg-[#15173F] text-white';
    case 'covered_with_criteria': return 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400';
    case 'experimental': return 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400';
    default: return 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400';
  }
}

function coverageLabel(status: string | undefined) {
  switch (status) {
    case 'covered': return 'Covered';
    case 'not_covered': return 'Not Covered';
    case 'covered_with_criteria': return 'Conditional';
    case 'experimental': return 'Experimental';
    case 'not_addressed': return 'N/A';
    default: return status ?? 'Unknown';
  }
}

export function CoverageMatrix({ comparisons }: { comparisons: ComparisonEntry[] }) {
  if (comparisons.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No coverage data found for this drug.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20]">
      <div className="grid grid-cols-7 gap-3 border-b border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <div>Plan</div>
        <div>Coverage</div>
        <div>Prior Auth</div>
        <div>Step</div>
        <div>Limit</div>
        <div className="col-span-2">Key Criteria</div>
      </div>
      {comparisons.map((row, i) => {
        const data = row.extractedData as Record<string, unknown> | undefined;
        const steps = data?.stepTherapy as Array<{ drugOrClass: string }> | undefined;
        const qty = data?.quantityLimits as { quantity: number; unit: string; period: string } | undefined;
        const criteria = data?.clinicalCriteria as Array<{ description: string }> | undefined;

        return (
          <div key={i} className={`grid grid-cols-7 gap-3 px-4 py-4 text-sm ${i < comparisons.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
            <div>
              <div className="font-semibold text-slate-800 dark:text-white">{row.payerName}</div>
              <div className="text-slate-500 dark:text-slate-400">{row.planName}</div>
            </div>
            <div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${coverageBadge(row.coverageStatus)}`}>
                {coverageLabel(row.coverageStatus)}
              </span>
            </div>
            <div className="text-slate-700 dark:text-slate-300">{row.priorAuth ? 'Required' : 'No'}</div>
            <div className="text-slate-700 dark:text-slate-300">{steps && steps.length > 0 ? 'Yes' : 'No'}</div>
            <div className="text-slate-700 dark:text-slate-300">{qty ? `${qty.quantity} ${qty.unit}` : 'Standard'}</div>
            <div className="col-span-2">
              <div className="text-slate-700 dark:text-slate-300">{criteria?.[0]?.description ?? '—'}</div>
              <div className="mt-1 text-xs text-slate-400">Effective {row.effectiveDate}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
