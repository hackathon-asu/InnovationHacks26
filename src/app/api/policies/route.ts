const FASTAPI = 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies`);
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ policies: [] });
  }
}
