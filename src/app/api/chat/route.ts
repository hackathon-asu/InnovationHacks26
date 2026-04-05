/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = body.messages?.[body.messages.length - 1]?.content || body.question;
    const provider = body.provider;
    const qs = provider ? `?provider=${provider}` : '';
    const res = await fetch(`${FASTAPI}/api/v1/query/ask${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        drug_filter: body.drug_filter,
        payer_filter: body.payer_filter,
      }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ answer: 'Backend unavailable', sources: [] }, { status: 503 });
  }
}
