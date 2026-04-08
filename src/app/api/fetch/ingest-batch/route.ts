const FASTAPI = 'http://localhost:8000';

export async function POST() {
  return Response.json(
    { error: 'Batch ingestion has been disabled. The hackathon demo period has ended.' },
    { status: 403 }
  );
}
