import Link from 'next/link';

async function getStats() {
  try {
    const res = await fetch('http://localhost:3000/api/stats', { cache: 'no-store' });
    return res.json();
  } catch {
    return { totalDrugs: 0, totalPlans: 0, totalPolicies: 0, totalChanges: 0 };
  }
}

async function getChanges() {
  try {
    const res = await fetch('http://localhost:3000/api/changes', { cache: 'no-store' });
    const data = await res.json();
    return data.changes ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, changes] = await Promise.all([getStats(), getChanges()]);

  const statCards = [
    { value: stats.totalPolicies, label: 'Policies uploaded' },
    { value: stats.totalDrugs, label: 'Drugs extracted' },
    { value: stats.totalPlans, label: 'Plans compared' },
    { value: stats.totalChanges, label: 'Policy changes' },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-slate-200"
        style={{
          backgroundImage: 'linear-gradient(rgba(21,23,63,0.55), rgba(21,23,63,0.45)), url("https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 space-y-8">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              Medical Benefit Drug Policy Tracker
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl font-[var(--font-montserrat)]">
              Compare drug coverage across health plans in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
              Upload policy PDFs, let AI extract and normalize the rules, then compare coverage, prior auth, step therapy, and restrictions for any drug.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/upload" className="rounded-xl bg-[#91BFEB] px-5 py-3 text-sm font-semibold text-[#15173F] shadow-sm transition hover:opacity-90">
                Upload Policies
              </Link>
              <Link href="/compare" className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15">
                View Comparison
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/20 bg-white/90 p-5 shadow-lg backdrop-blur">
                <div className="text-3xl font-bold text-[#15173F] font-[var(--font-montserrat)]">{item.value}</div>
                <div className="mt-1 text-sm text-slate-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Recent changes */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-semibold font-[var(--font-montserrat)]">Recent policy changes</h2>
              <p className="mt-1 text-sm text-slate-500">What changed across payer drug policies.</p>
            </div>
            <Link href="/changes" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              View all
            </Link>
          </div>

          {changes.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No changes yet. Upload policies to start tracking.</p>
          ) : (
            <div className="space-y-3">
              {changes.slice(0, 5).map((c: Record<string, unknown>, i: number) => (
                <div key={i} className="flex items-start justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <span className="font-medium text-slate-800">{String(c.payerName ?? '')}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="text-sm text-slate-500">{String(c.planName ?? '')}</span>
                    <p className="text-sm text-slate-600 mt-0.5 max-w-xl truncate">{String(c.changeSummary ?? c.policyTitle ?? '')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link href="/drugs" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group">
            <h3 className="text-lg font-semibold font-[var(--font-montserrat)] group-hover:text-[#91BFEB] transition-colors">Drug Search</h3>
            <p className="mt-2 text-sm text-slate-500">Search by drug name or J-code to find coverage across all plans.</p>
          </Link>
          <Link href="/chat" className="rounded-3xl border border-slate-200 bg-[#15173F] p-6 shadow-sm hover:shadow-md transition-shadow text-white">
            <h3 className="text-lg font-semibold font-[var(--font-montserrat)]">Ask AI</h3>
            <p className="mt-2 text-sm text-white/70">Ask natural language questions about drug coverage policies with cited answers.</p>
          </Link>
          <Link href="/api-docs" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group">
            <h3 className="text-lg font-semibold font-[var(--font-montserrat)] group-hover:text-[#91BFEB] transition-colors">API Documentation</h3>
            <p className="mt-2 text-sm text-slate-500">Explore the unified API — 16 endpoints across Next.js and FastAPI.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
