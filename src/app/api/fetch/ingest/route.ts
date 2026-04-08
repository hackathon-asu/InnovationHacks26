/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function POST() {
  return Response.json(
    { error: 'Ingestion has been disabled. The hackathon demo period has ended.' },
    { status: 403 }
  );
}
