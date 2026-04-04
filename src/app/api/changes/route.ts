import { getRecentChanges } from '@/lib/db/queries';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const changes = await getRecentChanges(limit);
  return Response.json({ changes });
}
