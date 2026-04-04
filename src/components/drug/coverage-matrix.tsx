'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import type { ComparisonEntry } from '@/lib/types/comparison';

function coverageColor(status: string | undefined) {
  switch (status) {
    case 'covered': return 'bg-[var(--color-covered)]/15 text-[var(--color-covered)]';
    case 'not_covered': return 'bg-[var(--color-not-covered)]/15 text-[var(--color-not-covered)]';
    case 'covered_with_criteria': return 'bg-[var(--color-criteria)]/15 text-[var(--color-criteria)]';
    case 'experimental': return 'bg-[var(--color-experimental)]/15 text-[var(--color-experimental)]';
    default: return 'bg-muted text-muted-foreground';
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
      <p className="text-sm text-muted-foreground">
        No coverage data found for this drug.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Payer</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead>Prior Auth</TableHead>
            <TableHead>Step Therapy</TableHead>
            <TableHead>Qty Limits</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparisons.map((row, i) => {
            const data = row.extractedData as Record<string, unknown> | undefined;
            const stepTherapy = data?.stepTherapy as Array<{ stepNumber: number; drugOrClass: string }> | undefined;
            const qtyLimits = data?.quantityLimits as { quantity: number; unit: string; period: string } | undefined;

            return (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.payerName}</TableCell>
                <TableCell>
                  <div>
                    <span className="text-sm">{row.planName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.lineOfBusiness}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={coverageColor(row.coverageStatus)} variant="secondary">
                    {coverageLabel(row.coverageStatus)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.priorAuth ? (
                    <Badge variant="outline">Required</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  {stepTherapy && stepTherapy.length > 0 ? (
                    <div className="space-y-1">
                      {stepTherapy.map((step) => (
                        <p key={step.stepNumber} className="text-xs">
                          <span className="font-mono text-muted-foreground">
                            Step {step.stepNumber}:
                          </span>{' '}
                          {step.drugOrClass}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell>
                  {qtyLimits ? (
                    <span className="text-sm font-mono">
                      {qtyLimits.quantity} {qtyLimits.unit}/{qtyLimits.period}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm">
                    {row.confidence != null
                      ? `${Math.round(row.confidence * 100)}%`
                      : '—'}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
