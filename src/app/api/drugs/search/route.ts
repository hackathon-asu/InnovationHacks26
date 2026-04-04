export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q || q.length < 2) return Response.json({ drugs: [] });

  // Drug search not yet available via FastAPI — return empty for now
  return Response.json({ drugs: [] });
}
