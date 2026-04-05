const FASTAPI = 'http://localhost:8000';

// GET /api/fetch/payers → proxy to FastAPI GET /api/v1/fetch/payers
export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/fetch/payers`);
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ payers: [] });
  }
}
