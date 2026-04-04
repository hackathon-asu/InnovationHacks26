const FASTAPI = 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const res = await fetch(`${FASTAPI}/api/v1/ingest/upload`, {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'Backend error' };
    }
    return Response.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
