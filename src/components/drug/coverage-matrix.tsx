'use client';

import type { ComparisonEntry } from '@/lib/types/comparison';

function coverageBadge(status: string | undefined) {
  switch (status) {
    case 'covered': return 'border-[#91BFEB] bg-[#dceeff] text-[#15173F]';
    case 'not_covered': return 'border-[#15173F] bg-[#15173F] text-white';
    case 'covered_with_criteria': return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'experimental': return 'border-purple-200 bg-purple-50 text-purple-800';
    default: return 'border-slate-200 bg-slate-50 text-slate-600';
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
    return <p className="text-sm text-slate-500 py-8 text-center">No coverage data found for this drug.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 gap-3 border-b border-slate-200 bg-[#F6F8FB] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          <div key={i} className={`grid grid-cols-7 gap-3 px-4 py-4 text-sm ${i < comparisons.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <div>
              <div className="font-semibold text-slate-800">{row.payerName}</div>
              <div className="text-slate-500">{row.planName}</div>
            </div>
            <div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${coverageBadge(row.coverageStatus)}`}>
                {coverageLabel(row.coverageStatus)}
              </span>
            </div>
            <div className="text-slate-700">{row.priorAuth ? 'Required' : 'No'}</div>
            <div className="text-slate-700">{steps && steps.length > 0 ? 'Yes' : 'No'}</div>
            <div className="text-slate-700">{qty ? `${qty.quantity} ${qty.unit}` : 'Standard'}</div>
            <div className="col-span-2">
              <div className="text-slate-700">{criteria?.[0]?.description ?? '—'}</div>
              <div className="mt-1 text-xs text-slate-400">Effective {row.effectiveDate}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
