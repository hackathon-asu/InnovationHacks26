/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import Link from 'next/link';

async function getStats() {
  try {
    const res = await fetch('http://localhost:3000/api/stats', { cache: 'no-store' });
    return res.json();
  } catch {
    return { totalDrugs: 0, totalPlans: 0, totalPolicies: 0, totalChanges: 0 };
  }
}

async function getPolicies() {
  try {
    const res = await fetch('http://localhost:3000/api/policies', { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
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
  const [stats, policies, changes] = await Promise.all([getStats(), getPolicies(), getChanges()]);

  const indexed = policies.filter((p: Record<string, unknown>) => p.status === 'indexed');

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 dark:border-[#91BFEB]/20 bg-[#15173F] dark:bg-[#181A20]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#91BFEB] font-medium">Medical Benefit Drug Policy Tracker</p>
              <h1 className="mt-2 text-3xl font-bold text-white font-[var(--font-montserrat)]">
                Policy Intelligence Dashboard
              </h1>
              <div className="mt-3 flex items-center gap-6 text-sm text-slate-300">
                <span>{stats.totalPolicies} policies</span>
                <span>{stats.totalDrugs} drugs</span>
                <span>{stats.totalPlans} payers</span>
                <span>{changes.length} changes</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/upload" className="rounded-xl bg-[#91BFEB] px-4 py-2.5 text-sm font-semibold text-[#15173F] hover:opacity-90 transition">
                Upload PDF
              </Link>
              <Link href="/fetch" className="rounded-xl border border-white/30 dark:border-[#91BFEB]/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition">
                Auto-Fetch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">

          {/* Left — Pipeline & Policies */}
          <div className="space-y-5">
            {/* Pipeline progress */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold font-[var(--font-montserrat)] dark:text-white">Ingested Policies</h2>
                <span className="text-xs text-slate-400">{indexed.length}/{policies.length} indexed</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-5">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: policies.length ? `${(indexed.length / policies.length) * 100}%` : '0%' }}
                />
              </div>

              {/* Policy list */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {policies.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No policies uploaded yet</p>
                ) : (
                  policies.slice(0, 10).map((p: Record<string, unknown>, i: number) => {
                    const status = String(p.status ?? 'pending');
                    const isIndexed = status === 'indexed';
                    const isFailed = status === 'failed';
                    const isProcessing = !isIndexed && !isFailed;
                    return (
                      <Link key={i} href={`/policies/${String(p.id)}`}>
                        <div className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          isIndexed ? 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : isFailed ? 'hover:bg-red-50 dark:hover:bg-red-500/10' : 'hover:bg-blue-50 dark:hover:bg-blue-500/10'
                        }`}>
                          {/* Status icon */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isIndexed ? 'bg-emerald-100 dark:bg-emerald-500/20' : isFailed ? 'bg-red-100 dark:bg-red-500/20' : 'bg-blue-100 dark:bg-blue-500/20'
                          }`}>
                            {isIndexed && <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {isFailed && <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                            {isProcessing && <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{String(p.payer_name || p.filename || 'Unknown')}</span>
                              {p.llm_provider ? (
                                <span className="shrink-0 rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">{String(p.llm_provider).replace('claude-direct', 'anthropic')}</span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{String(p.filename ?? '')}</p>
                          </div>
                          {/* Drug count */}
                          {Number(p.drug_count) > 0 && (
                            <span className="shrink-0 rounded-full border border-[#91BFEB] bg-[#dceeff] dark:bg-[#91BFEB]/15 px-2 py-0.5 text-xs font-medium text-[#15173F] dark:text-[#91BFEB]">
                              {Number(p.drug_count)} drugs
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {policies.length > 10 && (
                <Link href="/policies" className="mt-3 block text-center text-xs text-[#91BFEB] hover:underline">
                  View all {policies.length} policies
                </Link>
              )}
            </div>

            {/* Recent changes */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold font-[var(--font-montserrat)] dark:text-white">Recent Changes</h2>
                <Link href="/changes" className="text-xs text-[#91BFEB] hover:underline">View all</Link>
              </div>
              {changes.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No changes recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {changes.slice(0, 4).map((c: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-[#F6F8FB] dark:bg-white/5 p-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#91BFEB]" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{String(c.payerName ?? '')}</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{String(c.changeSummary ?? c.policyTitle ?? '')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Embedded ChatBot */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] shadow-sm flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="border-b border-slate-200 dark:border-white/10 px-5 py-4">
              <h2 className="text-lg font-semibold font-[var(--font-montserrat)] dark:text-white">Policy Q&A</h2>
              <p className="text-xs text-slate-400 mt-0.5">Ask about drug coverage across all indexed policies</p>
            </div>

            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Welcome message */}
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center text-white dark:text-[#15173F] text-xs font-bold">AI</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">AntonRX AI</span>
                    <span className="text-[10px] text-slate-400">just now</span>
                  </div>
                  <div className="rounded-xl bg-[#F6F8FB] dark:bg-white/5 p-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Welcome to <span className="font-semibold">AntonRX Policy Intelligence</span>. I can answer questions about drug coverage, prior auth criteria, step therapy, and policy differences across payers.
                  </div>
                  {/* Suggested questions */}
                  <div className="mt-3 rounded-xl border border-[#91BFEB]/30 bg-[#dceeff]/30 dark:bg-[#91BFEB]/10 p-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Most asked questions:</p>
                    <div className="space-y-1.5">
                      {[
                        'Which plans cover bevacizumab?',
                        'Compare step therapy for Rituxan',
                        'What prior auth does Cigna require for biologics?',
                        'What changed in recent policy updates?',
                      ].map((q) => (
                        <Link key={q} href={`/chat`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-[#15173F] dark:hover:text-white transition-colors">
                          {q} <span className="text-[#91BFEB]">&rarr;</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 dark:border-white/10 p-4">
              <Link href="/chat" className="flex items-center gap-3">
                <div className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-[#F6F8FB] dark:bg-white/5 px-4 py-2.5 text-sm text-slate-400">
                  Ask about drug coverage...
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#91BFEB] text-[#15173F] hover:opacity-90 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* Quick action cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { href: '/drugs', title: 'Drug Search', desc: 'Search by drug name or J-code', icon: 'search' },
            { href: '/compare', title: 'Compare', desc: 'Side-by-side payer comparison', icon: 'compare' },
            { href: '/fetch', title: 'Auto-Fetch', desc: 'Retrieve policies from payer sites', icon: 'fetch' },
            { href: '/api-docs', title: 'API Docs', desc: '16 endpoints across the stack', icon: 'api' },
          ].map((card) => (
            <Link key={card.href} href={card.href} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-4 hover:shadow-md hover:border-[#91BFEB]/50 transition-all group">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-[#15173F] dark:group-hover:text-[#91BFEB]">{card.title}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
