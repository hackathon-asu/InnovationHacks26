import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
      <p className="text-sm text-muted-foreground">
        No policy changes recorded yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      {changes.map((change, i) => {
        const diffs = change.diffJson as Array<{
          field: string;
          old: string;
          new: string;
          significance: string;
        }> | null;

        return (
          <div key={i} className="relative">
            <div className="absolute -left-6 top-3 h-2.5 w-2.5 rounded-full bg-primary" />
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{change.payerName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {change.planName}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    v{change.versionNumber}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {change.effectiveDate}
                  </span>
                </div>

                <p className="text-sm font-medium">{change.policyTitle}</p>

                {change.changeSummary && (
                  <p className="text-sm text-muted-foreground">
                    {change.changeSummary}
                  </p>
                )}

                {diffs && diffs.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {diffs.map((diff, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-2 text-xs rounded bg-muted/50 p-2"
                      >
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          {diff.significance}
                        </Badge>
                        <div>
                          <span className="font-medium">{diff.field}</span>
                          {diff.old && (
                            <span className="text-[var(--color-not-covered)] line-through ml-2">
                              {diff.old}
                            </span>
                          )}
                          {diff.new && (
                            <span className="text-[var(--color-covered)] ml-2">
                              {diff.new}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
