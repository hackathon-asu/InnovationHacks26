/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies`);
    const policies = await res.json();
    const indexed = Array.isArray(policies) ? policies.filter((p: { status: string }) => p.status === 'indexed') : [];
    const totalDrugs = indexed.reduce((sum: number, p: { drug_count: number }) => sum + (p.drug_count || 0), 0);
    const payers = new Set(indexed.map((p: { payer_name: string }) => p.payer_name).filter(Boolean));
    return Response.json({
      totalDrugs,
      totalPlans: payers.size,
      totalPolicies: indexed.length,
      totalChanges: 0,
    });
  } catch {
    return Response.json({ totalDrugs: 0, totalPlans: 0, totalPolicies: 0, totalChanges: 0 });
  }
}
