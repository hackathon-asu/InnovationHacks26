import { DrugSearch } from '@/components/drug/drug-search';

export default function DrugsPage() {
  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">Drug Search</h1>
        <p className="text-sm text-[#8b8b8b] mt-1">
          Search by drug name or J-code to see coverage across plans.
        </p>
      </div>
      <DrugSearch />
    </div>
  );
}
