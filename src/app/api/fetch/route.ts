/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

// POST /api/fetch — disabled after hackathon
export async function POST() {
  return Response.json(
    { error: 'Policy fetching has been disabled. The hackathon demo period has ended.' },
    { status: 403 }
  );
}

// GET /api/fetch — disabled after hackathon
export async function GET() {
  return Response.json({ count: 0, items: [] });
}
