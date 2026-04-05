'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white max-w-md mx-auto p-8 space-y-4">
        <h2 className="text-lg font-semibold font-[var(--font-montserrat)]">Something went wrong</h2>
        <p className="text-sm text-slate-500">{error.message || 'An unexpected error occurred.'}</p>
        <button onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Try again</button>
      </div>
    </main>
  );
}
