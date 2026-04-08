/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
interface ClaimDetailProps {
  drugBrandName: string | null;
  drugGenericName: string | null;
  rxcui: string | null;
  jCode: string | null;
  coverageStatus: string | null;
  priorAuthRequired: boolean | null;
  extractedData: unknown;
  sourceExcerpt: string | null;
  sourcePage: number | null;
  sourceSection: string | null;
  confidence: number | null;
}

export function ClaimDetail(props: ClaimDetailProps) {
  const data = props.extractedData as Record<string, unknown> | undefined;
  const pct = props.confidence != null ? Math.round(props.confidence * 100) : null;

  return (
    <div className="rounded-2xl border border-[#e8e8e4] bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#1a1a1a]">
          {props.drugBrandName ?? props.drugGenericName ?? 'Unknown Drug'}
        </h3>
        {pct != null && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
            pct >= 80 ? 'bg-emerald-100 text-emerald-700' :
            pct >= 60 ? 'bg-amber-100 text-amber-700' :
            'bg-[#f0f0ec] text-[#8b8b8b]'
          }`}>
            {pct}%
          </span>
        )}
      </div>

      {props.drugBrandName && props.drugGenericName && (
        <p className="text-sm text-[#8b8b8b]">{props.drugGenericName}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {props.coverageStatus && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            props.coverageStatus === 'covered' ? 'bg-emerald-100 text-emerald-700' :
            props.coverageStatus === 'not_covered' ? 'bg-red-100 text-red-700' :
            props.coverageStatus === 'covered_with_criteria' ? 'bg-amber-100 text-amber-700' :
            'bg-[#f0f0ec] text-[#8b8b8b]'
          }`}>
            {props.coverageStatus}
          </span>
        )}
        {props.priorAuthRequired && (
          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
            Prior Auth
          </span>
        )}
        {props.jCode && (
          <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs font-mono text-[#6b6b6b]">
            {props.jCode}
          </span>
        )}
        {props.rxcui && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-mono text-emerald-700">
            RxCUI: {props.rxcui}
          </span>
        )}
      </div>

      {Array.isArray(data?.clinicalCriteria) && (data.clinicalCriteria as Array<{ type: string; description: string }>).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-[#b0b0ac] uppercase tracking-wider">
            Clinical Criteria
          </p>
          {(data.clinicalCriteria as Array<{ type: string; description: string }>).map((c, i) => (
            <p key={i} className="text-sm text-[#6b6b6b]">
              <span className="text-[#8b8b8b]">{c.type}:</span> {c.description}
            </p>
          ))}
        </div>
      )}

      {props.sourceExcerpt && (
        <>
          <div className="h-px bg-[#f0f0ec]" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium text-[#b0b0ac] uppercase tracking-wider">Source</p>
              {props.sourcePage != null && (
                <span className="text-[10px] text-[#b0b0ac] font-mono">p.{props.sourcePage}</span>
              )}
              {props.sourceSection && (
                <span className="text-[10px] text-[#b0b0ac]">{props.sourceSection}</span>
              )}
            </div>
            <blockquote className="border-l-2 border-[#e0e0dc] pl-3 text-sm text-[#8b8b8b] italic">
              {props.sourceExcerpt}
            </blockquote>
          </div>
        </>
      )}
    </div>
  );
}
