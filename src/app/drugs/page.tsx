/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { DrugSearch } from '@/components/drug/drug-search';

export default function DrugsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <DrugSearch />
    </main>
  );
}
