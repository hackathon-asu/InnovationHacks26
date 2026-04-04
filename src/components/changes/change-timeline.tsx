interface PolicyChange {
  payerName: string;
  planName: string;
  policyTitle: string;
  policyNumber: string;
  versionNumber: number;
  effectiveDate: string;
  changeSummary: string | null;
  diffJson: unknown;
}

export function ChangeTimeline({ changes }: { changes: PolicyChange[] }) {
  if (changes.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">No policy changes recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {changes.map((change, i) => {
        const diffs = change.diffJson as Array<{ field: string; old: string; new: string; significance: string }> | null;
        return (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">{change.payerName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-sm text-slate-500">{change.planName}</span>
                <span className="rounded-full bg-[#dceeff] border border-[#91BFEB] px-2 py-0.5 text-xs font-mono font-semibold text-[#15173F]">v{change.versionNumber}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{change.effectiveDate}</span>
            </div>

            <p className="font-medium text-slate-800">{change.policyTitle}</p>

            {change.changeSummary && (
              <p className="text-sm text-slate-600 leading-relaxed">{change.changeSummary}</p>
            )}

            {diffs && diffs.length > 0 && (
              <div className="space-y-2 pt-1">
                {diffs.map((diff, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm rounded-xl bg-[#F6F8FB] p-3">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      diff.significance === 'breaking' ? 'border-red-200 bg-red-50 text-red-800' :
                      diff.significance === 'material' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                      'border-slate-200 bg-white text-slate-600'
                    }`}>
                      {diff.significance}
                    </span>
                    <div>
                      <span className="font-medium text-slate-800">{diff.field}</span>
                      {diff.old && <span className="text-red-500 line-through ml-2">{diff.old}</span>}
                      {diff.new && <span className="text-emerald-600 ml-2">{diff.new}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
