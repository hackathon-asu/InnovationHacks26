const FASTAPI = 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/changes`);
    if (!res.ok) return Response.json({ changes: [] });
    const data = await res.json();
    return Response.json({ changes: data });
  } catch {
    return Response.json({ changes: [] });
  }
}
