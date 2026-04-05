import { PolicyCard } from '@/components/policy/policy-card';
import Link from 'next/link';

async function getPolicies() {
  try {
    const res = await fetch('http://localhost:3000/api/policies', { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function PoliciesPage() {
  const policies = await getPolicies();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-[var(--font-montserrat)]">Policies</h1>
          <p className="mt-1 text-sm text-slate-500">Browse medical policies by payer and plan.</p>
        </div>
        <Link
          href="/upload"
          className="rounded-xl bg-[#15173F] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Upload PDF
        </Link>
      </div>
      {policies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-500 text-sm">No policies yet.</p>
          <Link href="/upload" className="mt-2 inline-block text-sm font-semibold text-[#15173F] underline underline-offset-2">
            Upload a PDF to get started
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p: Record<string, unknown>) => (
            <PolicyCard
              key={String(p.id)}
              id={String(p.id)}
              filename={String(p.filename ?? '')}
              payer_name={String(p.payer_name ?? '')}
              effective_date={p.effective_date ? String(p.effective_date) : null}
              status={String(p.status ?? 'pending')}
              drug_count={Number(p.drug_count ?? 0)}
              llm_provider={p.llm_provider ? String(p.llm_provider) : null}
              created_at={String(p.created_at ?? new Date().toISOString())}
              updated_at={p.updated_at ? String(p.updated_at) : null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
