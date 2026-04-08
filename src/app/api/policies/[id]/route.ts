/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies/${id}`);
    if (!res.ok) return Response.json({ error: 'Policy not found' }, { status: 404 });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Backend unavailable' }, { status: 503 });
  }
}

// DELETE disabled post-hackathon
export async function DELETE() {
  return Response.json(
    { error: 'Delete is disabled. The hackathon demo period has ended.' },
    { status: 403 }
  );
}
