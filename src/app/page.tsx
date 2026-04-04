import { Suspense } from 'react';
import Link from 'next/link';
import { getDashboardStats, getRecentChanges } from '@/lib/db/queries';

async function StatsGrid() {
  const stats = await getDashboardStats();
  const items = [
    { value: stats.totalPolicies, label: 'Policies uploaded' },
    { value: stats.totalDrugs, label: 'Drugs extracted' },
    { value: stats.totalPlans, label: 'Plans compared' },
    { value: stats.totalChanges, label: 'Policy changes' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 self-end md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/20 bg-white/90 p-5 shadow-lg backdrop-blur">
          <div className="text-3xl font-bold text-[#15173F] font-[var(--font-montserrat)]">{item.value}</div>
          <div className="mt-1 text-sm text-slate-600">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

async function RecentChangesSection() {
  const changes = await getRecentChanges(5);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-semibold font-[var(--font-montserrat)]">Recent policy changes</h2>
          <p className="mt-1 text-sm text-slate-500">What changed across payer drug policies this quarter.</p>
        </div>
        <Link href="/changes" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          View all
        </Link>
      </div>

      {changes.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No changes yet. Upload policies to see version tracking.</p>
      ) : (
        <div className="space-y-3">
          {changes.map((c, i) => {
            const diffs = c.diffJson as Array<{ field: string; significance: string; old?: string; new?: string }> | null;
            const severity = diffs?.[0]?.significance;
            return (
              <div key={i} className="flex items-start justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{c.payerName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-sm text-slate-500">{c.planName}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5 max-w-xl">
                    {c.changeSummary ?? c.policyTitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {severity && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      severity === 'breaking' ? 'border border-red-200 bg-red-50 text-red-800' :
                      severity === 'material' ? 'border border-amber-200 bg-amber-50 text-amber-800' :
                      'border border-slate-200 bg-slate-50 text-slate-700'
                    }`}>
                      {severity}
                    </span>
                  )}
                  <span className="rounded-full bg-[#dceeff] border border-[#91BFEB] px-3 py-1 text-xs font-semibold text-[#15173F]">
                    v{c.versionNumber}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 gap-4 self-end md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/20 bg-white/60 p-5 h-24 animate-pulse" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
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

          <Suspense fallback={<StatsLoading />}>
            <StatsGrid />
          </Suspense>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <Suspense fallback={<div className="h-64 bg-white rounded-3xl animate-pulse" />}>
          <RecentChangesSection />
        </Suspense>

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
