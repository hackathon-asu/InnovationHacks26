import { DrugSearch } from '@/components/drug/drug-search';

export default function DrugsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">Drug Search</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search by drug name or J-code to see coverage across plans.</p>
      </div>
      <DrugSearch />
    </main>
  );
}
