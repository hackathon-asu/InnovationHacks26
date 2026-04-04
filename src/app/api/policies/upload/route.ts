const FASTAPI = 'http://localhost:8000';

export async function POST(request: Request) {
  const formData = await request.formData();
  const res = await fetch(`${FASTAPI}/api/v1/ingest/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
