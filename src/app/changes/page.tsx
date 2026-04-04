import { Suspense } from 'react';
import { ChangeTimeline } from '@/components/changes/change-timeline';
import { getRecentChanges } from '@/lib/db/queries';

async function ChangesList() {
  const changes = await getRecentChanges(30);
  return <ChangeTimeline changes={changes} />;
}

export default function ChangesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)]">Policy Changes</h1>
        <p className="mt-1 text-sm text-slate-500">Track what changed across policy versions.</p>
      </div>
      <Suspense fallback={<div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}</div>}>
        <ChangesList />
      </Suspense>
    </main>
  );
}
