/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { ChangeTimeline } from '@/components/changes/change-timeline';

const FASTAPI = process.env.FASTAPI_URL ?? 'http://localhost:8000';

async function getChanges() {
  try {
    const res = await fetch(`${FASTAPI}/api/v1/ingest/changes`, { cache: 'no-store' });
    const data = await res.json();
    return data.changes ?? [];
  } catch {
    return [];
  }
}

export default async function ChangesPage() {
  const changes = await getChanges();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Policy Changes</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track what changed across policy versions.</p>
      </div>
      <ChangeTimeline changes={changes} />
    </main>
  );
}
