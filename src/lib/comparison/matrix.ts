import { getDrugCoverage } from '@/lib/db/queries';

export interface ComparisonRow {
  payerName: string;
  planName: string;
  lineOfBusiness: string | null;
  state: string | null;
  productType: string | null;
  coverageStatus: string | null;
  priorAuth: boolean | null;
  extractedData: unknown;
  sourceExcerpt: string | null;
  confidence: number | null;
  policyNumber: string;
  effectiveDate: string;
}

export async function buildCoverageMatrix(rxcui: string): Promise<ComparisonRow[]> {
  const rows = await getDrugCoverage(rxcui);
  return rows as ComparisonRow[];
}
