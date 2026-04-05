/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

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
