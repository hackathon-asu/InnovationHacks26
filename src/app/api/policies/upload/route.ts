/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const qs = provider ? `?provider=${provider}` : '';

    // Forward the raw request body + content-type header to preserve multipart boundary
    const contentType = request.headers.get('content-type') || '';
    const body = await request.arrayBuffer();

    const res = await fetch(`${FASTAPI}/api/v1/ingest/upload${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
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
