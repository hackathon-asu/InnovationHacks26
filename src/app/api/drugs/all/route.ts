/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies`);
    if (!res.ok) return Response.json({ drugs: [] });
    const policies = await res.json();

    const drugMap = new Map<string, {
      brandName: string;
      genericName: string | null;
      jCode: string | null;
      rxcui: string | null;
      drugClass: string | null;
      indication: string | null;
      coverageStatus: string | null;
      priorAuth: boolean;
      planCount: number;
      payers: string[];
    }>();

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
              const key = brand.toLowerCase().replace(/[®™\s]/g, '') || (drug.drug_generic_name ?? '').toLowerCase();
              if (!key) continue;
              const existing = drugMap.get(key);
              if (existing) {
                existing.planCount++;
                if (p.payer_name && !existing.payers.includes(p.payer_name)) {
                  existing.payers.push(p.payer_name);
                }
              } else {
                drugMap.set(key, {
                  brandName: brand || null,
                  genericName: drug.drug_generic_name || null,
                  jCode: drug.j_code || null,
                  rxcui: drug.rxcui || null,
                  drugClass: drug.drug_class || null,
                  indication: drug.indication || null,
                  coverageStatus: drug.coverage_status || null,
                  priorAuth: drug.prior_auth_required ?? false,
                  planCount: 1,
                  payers: p.payer_name ? [p.payer_name] : [],
                });
              }
            }
          } catch { /* skip */ }
        })
    );

    const drugs = Array.from(drugMap.values()).sort((a, b) => b.planCount - a.planCount);
    return Response.json({ drugs });
  } catch {
    return Response.json({ drugs: [] });
  }
}
