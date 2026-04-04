import { Suspense } from 'react';
import Link from 'next/link';
import { getDashboardStats, getRecentChanges } from '@/lib/db/queries';

async function StatsCards() {
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Drugs Tracked', sublabel: 'Unique medications monitored', value: stats.totalDrugs, color: 'from-emerald-50 to-teal-50', accent: 'text-emerald-700' },
    { label: 'Health Plans', sublabel: 'Across 5 major payers', value: stats.totalPlans, color: 'from-amber-50 to-orange-50', accent: 'text-amber-700' },
    { label: 'Active Policies', sublabel: 'Coverage documents analyzed', value: stats.totalPolicies, color: 'from-blue-50 to-indigo-50', accent: 'text-blue-700' },
    { label: 'Policy Changes', sublabel: 'Version updates this quarter', value: stats.totalChanges, color: 'from-rose-50 to-pink-50', accent: 'text-rose-700' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl bg-gradient-to-br ${card.color} border border-[#e8e8e4] p-5`}
        >
          <p className="text-sm font-medium text-[#1a1a1a]">{card.label}</p>
          <p className="text-xs text-[#8b8b8b] mt-0.5">{card.sublabel}</p>
          <p className={`text-3xl font-semibold mt-3 font-mono tracking-tight ${card.accent}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

async function RecentChangesTable() {
  const changes = await getRecentChanges(6);

  if (changes.length === 0) {
    return (
      <p className="text-sm text-[#8b8b8b] py-8 text-center">
        No recent changes. Upload policies to see version tracking.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e8e8e4]">
            <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Payer</th>
            <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Policy</th>
            <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Version</th>
            <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Change</th>
            <th className="text-left py-3 px-4 font-medium text-[#8b8b8b]">Effective</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => {
            const diffs = c.diffJson as Array<{ significance: string }> | null;
            const severity = diffs?.[0]?.significance;
            return (
              <tr key={i} className="border-b border-[#f0f0ec] hover:bg-[#f8f8f5] transition-colors">
                <td className="py-3 px-4 font-medium">{c.payerName}</td>
                <td className="py-3 px-4 text-[#6b6b6b]">{c.policyTitle}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs font-mono">
                    v{c.versionNumber}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {severity && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      severity === 'breaking' ? 'bg-red-100 text-red-700' :
                      severity === 'material' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {severity}
                    </span>
                  )}
                  <span className="block text-xs text-[#8b8b8b] mt-0.5 max-w-xs truncate">
                    {c.changeSummary}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-[#8b8b8b]">
                  {c.effectiveDate}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-[#f4f4f0] border border-[#e8e8e4] p-5 animate-pulse h-28" />
      ))}
    </div>
  );
}

function TableLoading() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-[#f4f4f0] rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hero with warm gradient */}
      <div className="relative -mx-6 px-6 pt-10 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/60 via-emerald-50/40 to-teal-100/50 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-full blur-3xl -z-10" />

        <div className="flex items-baseline gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1a1a1a]">
            Overview
          </h1>
          <Link href="/drugs" className="text-4xl font-semibold tracking-tight text-[#c8c8c4] hover:text-[#8b8b8b] transition-colors">
            Drugs
          </Link>
          <Link href="/policies" className="text-4xl font-semibold tracking-tight text-[#c8c8c4] hover:text-[#8b8b8b] transition-colors">
            Policies
          </Link>
        </div>

        <div className="flex gap-6 mt-6 border-b border-[#e0e0dc]">
          <span className="text-sm font-medium text-[#1a1a1a] pb-2 border-b-2 border-[#1a1a1a]">
            Coverage
          </span>
          <Link href="/changes" className="text-sm font-medium text-[#8b8b8b] pb-2 hover:text-[#1a1a1a] transition-colors">
            Changes
          </Link>
          <Link href="/compare" className="text-sm font-medium text-[#8b8b8b] pb-2 hover:text-[#1a1a1a] transition-colors">
            Comparison
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <Suspense fallback={<StatsLoading />}>
        <StatsCards />
      </Suspense>

      {/* Main content: table + AI chat */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Changes table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Recent Policy Changes
            </h2>
            <Link
              href="/changes"
              className="text-sm text-[#8b8b8b] hover:text-[#1a1a1a] transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {['All Changes', 'Breaking', 'Material', 'Minor'].map((filter, i) => (
              <span
                key={filter}
                className={`rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                  i === 0
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#f0f0ec] text-[#6b6b6b] hover:bg-[#e4e4e0]'
                }`}
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-[#e8e8e4] bg-white overflow-hidden">
            <Suspense fallback={<TableLoading />}>
              <RecentChangesTable />
            </Suspense>
          </div>
        </div>

        {/* AI Assistant panel */}
        <div className="rounded-2xl border border-[#e8e8e4] bg-white overflow-hidden flex flex-col h-[480px]">
          <div className="flex items-center gap-3 p-4 border-b border-[#f0f0ec]">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold">Policy Assistant</p>
              <p className="text-xs text-[#8b8b8b]">Ask about drug coverage</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="bg-[#f4f4f0] rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
              <p className="text-sm leading-relaxed">
                You have <strong>4 policy changes</strong> this quarter. UHC added biosimilar step therapy for Humira, and Aetna simplified their criteria.
              </p>
              <p className="text-[10px] text-[#8b8b8b] mt-1.5 text-right">9:40</p>
            </div>

            <div className="bg-white border border-[#e8e8e4] rounded-2xl rounded-tr-sm p-3 max-w-[85%] ml-auto">
              <p className="text-sm">Which changes are most significant?</p>
              <p className="text-[10px] text-[#8b8b8b] mt-1.5 text-right">9:45</p>
            </div>

            <div className="bg-[#f4f4f0] rounded-2xl rounded-tl-sm p-3 max-w-[85%]">
              <p className="text-sm leading-relaxed">
                UHC&apos;s Humira policy now requires a <strong>biosimilar trial</strong> before brand — this is a breaking change that affects prior auth workflows.
              </p>
              <p className="text-[10px] text-[#8b8b8b] mt-1.5 text-right">9:45</p>
            </div>
          </div>

          <div className="p-3 border-t border-[#f0f0ec]">
            <Link
              href="/chat"
              className="flex items-center justify-center w-full rounded-full bg-[#f4f4f0] hover:bg-[#eaeae6] text-sm text-[#6b6b6b] py-2.5 transition-colors"
            >
              Open full chat →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
