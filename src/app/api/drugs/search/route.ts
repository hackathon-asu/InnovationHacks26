/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q || q.length < 2) return Response.json({ drugs: [] });

  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies`);
    if (!res.ok) return Response.json({ drugs: [] });
    const policies = await res.json();

    const drugMap = new Map<string, { brandName: string; genericName: string | null; jCode: string | null; rxcui: string | null; planCount: number }>();
    const qLower = q.toLowerCase();

    await Promise.all(
      policies
        .filter((p: { status: string }) => p.status === 'indexed')
        .map(async (p: { id: string; payer_name: string }) => {
          try {
            const detail = await fetch(`${FASTAPI}/api/v1/ingest/policies/${p.id}`);
            if (!detail.ok) return;
            const data = await detail.json();
            for (const drug of data.drug_coverages ?? []) {
              const brand = drug.drug_brand_name ?? '';
              const generic = drug.drug_generic_name ?? '';
              const jCode = drug.j_code ?? '';
              if (
                brand.toLowerCase().includes(qLower) ||
                generic.toLowerCase().includes(qLower) ||
                jCode.toLowerCase().includes(qLower)
              ) {
                const key = brand.toLowerCase().replace(/[®™\s]/g, '');
                const existing = drugMap.get(key);
                if (existing) {
                  existing.planCount++;
                } else {
                  drugMap.set(key, {
                    brandName: brand,
                    genericName: generic || null,
                    jCode: jCode || null,
                    rxcui: drug.rxcui || null,
                    planCount: 1,
                  });
                }
              }
            }
          } catch { /* skip failed policy fetches */ }
        })
    );

    const drugs = Array.from(drugMap.values()).sort((a, b) => b.planCount - a.planCount);
    return Response.json({ drugs });
  } catch {
    return Response.json({ drugs: [] });
  }
}
