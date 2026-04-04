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

interface ChangeTimelineProps {
  changes: PolicyChange[];
}

export function ChangeTimeline({ changes }: ChangeTimelineProps) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-[#8b8b8b] py-8 text-center">
        No policy changes recorded yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-[#e0e0dc]" />
      {changes.map((change, i) => {
        const diffs = change.diffJson as Array<{
          field: string;
          old: string;
          new: string;
          significance: string;
        }> | null;

        return (
          <div key={i} className="relative">
            <div className="absolute -left-6 top-4 h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="rounded-2xl border border-[#e8e8e4] bg-white p-5 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-[#1a1a1a]">{change.payerName}</span>
                <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs text-[#6b6b6b]">
                  {change.planName}
                </span>
                <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs font-mono text-[#6b6b6b]">
                  v{change.versionNumber}
                </span>
                <span className="text-xs text-[#8b8b8b] font-mono">
                  {change.effectiveDate}
                </span>
              </div>

              <p className="text-sm font-medium text-[#1a1a1a]">{change.policyTitle}</p>

              {change.changeSummary && (
                <p className="text-sm text-[#6b6b6b] leading-relaxed">
                  {change.changeSummary}
                </p>
              )}

              {diffs && diffs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {diffs.map((diff, j) => (
                    <div
                      key={j}
                      className="flex items-start gap-2 text-xs rounded-lg bg-[#f8f8f5] p-2.5"
                    >
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        diff.significance === 'breaking' ? 'bg-red-100 text-red-700' :
                        diff.significance === 'material' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {diff.significance}
                      </span>
                      <div>
                        <span className="font-medium text-[#1a1a1a]">{diff.field}</span>
                        {diff.old && (
                          <span className="text-red-500 line-through ml-2">
                            {diff.old}
                          </span>
                        )}
                        {diff.new && (
                          <span className="text-emerald-600 ml-2">
                            {diff.new}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
