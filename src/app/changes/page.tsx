import { Suspense } from 'react';
import { ChangeTimeline } from '@/components/changes/change-timeline';
import { getRecentChanges } from '@/lib/db/queries';

async function ChangesList() {
  const changes = await getRecentChanges(30);
  return <ChangeTimeline changes={changes} />;
}

export default function ChangesPage() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
          Policy Changes
        </h1>
        <p className="text-sm text-[#8b8b8b] mt-1">
          Track what changed across policy versions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4 pl-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-[#f4f4f0] rounded-2xl animate-pulse" />
            ))}
          </div>
        }
      >
        <ChangesList />
      </Suspense>
    </div>
  );
}
