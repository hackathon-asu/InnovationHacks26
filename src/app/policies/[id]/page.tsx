import { notFound } from 'next/navigation';

async function getPolicy(id: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/policies/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPolicy(id);
  if (!data) notFound();

  const policy = data.policy ?? data;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">
            {String(policy.title ?? policy.filename ?? 'Policy Detail')}
          </h1>
          <span className="rounded-full border border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 px-2.5 py-0.5 text-xs font-semibold text-[#15173F] dark:text-[#91BFEB]">
            {String(policy.status ?? 'active')}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {String(policy.payerName ?? policy.payer_name ?? '')} • {String(policy.policyNumber ?? policy.policy_number ?? '')}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-6 shadow-sm">
        <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  );
}
