export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Policies</h1>
      <p className="text-muted-foreground">
        Browse and search medical policies by payer, plan, or drug.
      </p>
      {/* TODO: Filterable policy table with payer/plan chips */}
    </div>
  );
}
