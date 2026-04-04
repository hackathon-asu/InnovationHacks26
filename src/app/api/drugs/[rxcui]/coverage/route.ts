import { getDrugCoverage } from '@/lib/db/queries';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ rxcui: string }> },
) {
  const { rxcui } = await params;
  const comparisons = await getDrugCoverage(rxcui);
  return Response.json({ drug: rxcui, comparisons });
}
