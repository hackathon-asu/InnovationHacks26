'use client';

import type { ComparisonEntry } from '@/lib/types/comparison';

function coverageStyle(status: string | undefined) {
  switch (status) {
    case 'covered': return 'bg-emerald-100 text-emerald-700';
    case 'not_covered': return 'bg-red-100 text-red-700';
    case 'covered_with_criteria': return 'bg-amber-100 text-amber-700';
    case 'experimental': return 'bg-purple-100 text-purple-700';
    default: return 'bg-[#f0f0ec] text-[#8b8b8b]';
  }
}

function coverageLabel(status: string | undefined) {
  switch (status) {
    case 'covered': return 'Covered';
    case 'not_covered': return 'Not Covered';
    case 'covered_with_criteria': return 'With Criteria';
    case 'experimental': return 'Experimental';
    case 'not_addressed': return 'Not Addressed';
    default: return status ?? 'Unknown';
  }
}

interface CoverageMatrixProps {
  comparisons: ComparisonEntry[];
}

export function CoverageMatrix({ comparisons }: CoverageMatrixProps) {
  if (comparisons.length === 0) {
    return (
      <p className="text-sm text-[#8b8b8b] py-8 text-center">
        No coverage data found for this drug.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e8e8e4] bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8e4]">
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Payer</th>
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Plan</th>
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Coverage</th>
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Prior Auth</th>
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Step Therapy</th>
              <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Qty Limits</th>
              <th className="text-right py-3 px-4 font-medium text-[#8b8b8b]">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, i) => {
              const data = row.extractedData as Record<string, unknown> | undefined;
              const stepTherapy = data?.stepTherapy as Array<{ stepNumber: number; drugOrClass: string }> | undefined;
              const qtyLimits = data?.quantityLimits as { quantity: number; unit: string; period: string } | undefined;

              return (
                <tr key={i} className="border-b border-[#f0f0ec] hover:bg-[#f8f8f5] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#1a1a1a]">{row.payerName}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-[#1a1a1a]">{row.planName}</span>
                    <span className="block text-xs text-[#8b8b8b]">{row.lineOfBusiness}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${coverageStyle(row.coverageStatus)}`}>
                      {coverageLabel(row.coverageStatus)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {row.priorAuth ? (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">Required</span>
                    ) : (
                      <span className="text-sm text-[#8b8b8b]">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {stepTherapy && stepTherapy.length > 0 ? (
                      <div className="space-y-1">
                        {stepTherapy.map((step) => (
                          <p key={step.stepNumber} className="text-xs text-[#6b6b6b]">
                            <span className="font-mono text-[#8b8b8b]">Step {step.stepNumber}:</span>{' '}
                            {step.drugOrClass}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-[#8b8b8b]">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {qtyLimits ? (
                      <span className="text-sm font-mono text-[#6b6b6b]">
                        {qtyLimits.quantity} {qtyLimits.unit}/{qtyLimits.period}
                      </span>
                    ) : (
                      <span className="text-sm text-[#8b8b8b]">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono text-sm text-[#6b6b6b]">
                      {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
