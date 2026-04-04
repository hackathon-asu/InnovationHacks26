import { searchDrugs } from '@/lib/db/queries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (!q || q.length < 2) {
    return Response.json({ drugs: [] });
  }

  const drugs = await searchDrugs(q, limit);
  return Response.json({ drugs });
}
