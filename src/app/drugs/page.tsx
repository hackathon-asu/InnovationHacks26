import { DrugSearch } from '@/components/drug/drug-search';

export default function DrugsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drug Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search by drug name or J-code to see coverage across plans.
        </p>
      </div>
      <DrugSearch />
    </div>
  );
}
