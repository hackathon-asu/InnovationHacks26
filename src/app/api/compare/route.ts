import { getDrugCoverage } from '@/lib/db/queries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const drug = searchParams.get('drug');

  if (!drug) {
    return Response.json({ error: 'Missing drug parameter' }, { status: 400 });
  }

  const comparisons = await getDrugCoverage(drug);
  return Response.json({ drug, comparisons });
}
