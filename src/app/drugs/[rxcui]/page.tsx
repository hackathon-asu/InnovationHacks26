export default async function DrugCoveragePage({
  params,
}: {
  params: Promise<{ rxcui: string }>;
}) {
  const { rxcui } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Coverage Matrix — {rxcui}
      </h1>
      <p className="text-muted-foreground">
        Coverage comparison across all plans for this drug.
      </p>
      {/* TODO: CoverageMatrix component */}
    </div>
  );
}
