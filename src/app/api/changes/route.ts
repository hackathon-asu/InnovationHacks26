/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
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
