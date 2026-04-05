const FASTAPI = 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${FASTAPI}/api/v1/fetch/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingest failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
