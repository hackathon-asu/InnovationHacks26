import { PolicyCard } from '@/components/policy/policy-card';

async function getPolicies() {
  try {
    const res = await fetch('http://localhost:3000/api/policies', { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.policies ?? []);
  } catch {
    return [];
  }
}

export default async function PoliciesPage() {
  const policies = await getPolicies();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)]">Policies</h1>
        <p className="mt-1 text-sm text-slate-500">Browse medical policies by payer and plan.</p>
      </div>
      {policies.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No policies yet. Upload PDFs to get started.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p: Record<string, unknown>) => (
            <PolicyCard
              key={String(p.id)}
              id={String(p.id)}
              policyNumber={String(p.policyNumber ?? p.policy_number ?? '')}
              title={String(p.title ?? p.filename ?? '')}
              effectiveDate={String(p.effectiveDate ?? p.effective_date ?? '')}
              version={Number(p.version ?? 1)}
              status={String(p.status ?? 'active')}
              planName={String(p.planName ?? p.payer_name ?? '')}
              lineOfBusiness={String(p.lineOfBusiness ?? p.policy_type ?? '')}
              payerName={String(p.payerName ?? p.payer_name ?? '')}
            />
          ))}
        </div>
      )}
    </main>
  );
}
