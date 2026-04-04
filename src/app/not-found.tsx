import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white max-w-md mx-auto p-8 space-y-4">
        <h2 className="text-lg font-semibold font-[var(--font-montserrat)]">Page not found</h2>
        <p className="text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Dashboard</Link>
      </div>
    </main>
  );
}
