const FASTAPI = 'http://localhost:8000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const drug = searchParams.get('drug');

  if (!drug) {
    return Response.json({ error: 'Missing drug parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(`${FASTAPI}/api/v1/query/compare/${encodeURIComponent(drug)}`);
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ drug, comparisons: [] });
  }
}
