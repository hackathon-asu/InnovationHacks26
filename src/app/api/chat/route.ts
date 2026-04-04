const FASTAPI = 'http://localhost:8000';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${FASTAPI}/api/v1/query/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: body.messages?.[body.messages.length - 1]?.content || body.question,
      drug_filter: body.drug_filter,
      payer_filter: body.payer_filter,
    }),
  });
  const data = await res.json();
  return Response.json(data);
}
