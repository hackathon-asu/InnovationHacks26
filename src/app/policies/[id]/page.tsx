export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Policy Detail — {id}
      </h1>
      <p className="text-muted-foreground">
        Extracted coverage claims with provenance and confidence scores.
      </p>
      {/* TODO: Policy claims, source excerpts, confidence badges */}
    </div>
  );
}
