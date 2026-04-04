export async function GET(
  _req: Request,
  { params }: { params: Promise<{ rxcui: string }> },
) {
  const { rxcui } = await params;
  // Coverage matrix not yet available via FastAPI — return empty
  return Response.json({ drug: rxcui, comparisons: [] });
}
