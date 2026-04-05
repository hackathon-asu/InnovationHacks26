/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { DrugSearch } from '@/components/drug/drug-search';

export default function DrugsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Drug Coverage</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          All extracted drugs across ingested policies. Click a card for details or compare across payers.
        </p>
      </div>
      <DrugSearch />
    </main>
  );
}
