const FASTAPI = 'http://localhost:8000';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ rxcui: string }> },
) {
  const { rxcui } = await params;
  // rxcui here is actually used as drug name for compare
  try {
    const res = await fetch(`${FASTAPI}/api/v1/query/compare/${encodeURIComponent(rxcui)}`);
    if (!res.ok) return Response.json({ drug: rxcui, comparisons: [] });
    const data = await res.json();

    // Map FastAPI PayerComparisonRow to frontend ComparisonEntry
    const comparisons = (data.payer_comparisons ?? []).map((row: Record<string, unknown>) => ({
      payerName: row.payer_name ?? '',
      planName: row.payer_name ?? '',
      lineOfBusiness: '',
      coverageStatus: row.coverage_status ?? 'not_addressed',
      priorAuth: row.prior_auth_required ?? false,
      extractedData: {
        stepTherapy: (row.step_therapy_steps as number) > 0
          ? Array.from({ length: row.step_therapy_steps as number }, (_, i) => ({ stepNumber: i + 1, drugOrClass: '' }))
          : [],
        quantityLimits: row.quantity_limit ? { quantity: 0, unit: String(row.quantity_limit), period: '' } : undefined,
        clinicalCriteria: (row.approved_diagnoses as string[])?.length
          ? (row.approved_diagnoses as string[]).map((d: string) => ({ type: 'diagnosis', description: d }))
          : [],
      },
      confidence: 1,
      policyNumber: '',
      effectiveDate: row.last_updated ? String(row.last_updated).split('T')[0] : '',
    }));

    return Response.json({
      drug: { brandName: data.drug_brand_name, genericName: data.drug_generic_name, rxcui: data.rxcui },
      comparisons,
    });
  } catch {
    return Response.json({ drug: rxcui, comparisons: [] });
  }
}
