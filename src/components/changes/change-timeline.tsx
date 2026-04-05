/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
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
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No policy changes recorded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {changes.map((change, i) => {
        const diffs = change.diffJson as Array<{ field: string; old: string; new: string; significance: string }> | null;
        return (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-white">{change.payerName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{change.planName}</span>
                <span className="rounded-full bg-[#dceeff] dark:bg-[#91BFEB]/15 border border-[#91BFEB] px-2 py-0.5 text-xs font-mono font-semibold text-[#15173F] dark:text-[#91BFEB]">v{change.versionNumber}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{change.effectiveDate}</span>
            </div>

            <p className="font-medium text-slate-800 dark:text-slate-200">{change.policyTitle}</p>

            {change.changeSummary && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{change.changeSummary}</p>
            )}

            {diffs && diffs.length > 0 && (
              <div className="space-y-2 pt-1">
                {diffs.map((diff, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm rounded-xl bg-[#F0EDE8] dark:bg-white/5 p-3">
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      diff.significance === 'breaking' ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400' :
                      diff.significance === 'material' ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400' :
                      'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400'
                    }`}>
                      {diff.significance}
                    </span>
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{diff.field}</span>
                      {diff.old && <span className="text-red-500 dark:text-red-400 line-through ml-2">{diff.old}</span>}
                      {diff.new && <span className="text-emerald-600 dark:text-emerald-400 ml-2">{diff.new}</span>}
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
