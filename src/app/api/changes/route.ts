/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

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
