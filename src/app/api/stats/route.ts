const FASTAPI = 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/policies`);
    const policies = await res.json();
    const count = Array.isArray(policies) ? policies.length : 0;
    return Response.json({
      totalDrugs: 0,
      totalPlans: 0,
      totalPolicies: count,
      totalChanges: 0,
    });
  } catch {
    return Response.json({ totalDrugs: 0, totalPlans: 0, totalPolicies: 0, totalChanges: 0 });
  }
}
