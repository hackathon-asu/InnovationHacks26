import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangeTimeline } from '@/components/changes/change-timeline';
import { getRecentChanges } from '@/lib/db/queries';

async function ChangesList() {
  const changes = await getRecentChanges(30);
  return <ChangeTimeline changes={changes} />;
}

export default function ChangesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Policy Changes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track what changed across policy versions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4 pl-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <ChangesList />
      </Suspense>
    </div>
  );
}
