import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

function confidenceBadge(confidence: number | null) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const variant = pct >= 80 ? 'default' : pct >= 60 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="font-mono text-xs">
      {pct}% confidence
    </Badge>
  );
}

export function ClaimDetail(props: ClaimDetailProps) {
  const data = props.extractedData as Record<string, unknown> | undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {props.drugBrandName ?? props.drugGenericName ?? 'Unknown Drug'}
          </CardTitle>
          {confidenceBadge(props.confidence)}
        </div>
        {props.drugBrandName && props.drugGenericName && (
          <p className="text-sm text-muted-foreground">
            {props.drugGenericName}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {props.coverageStatus && (
            <Badge variant="secondary">{props.coverageStatus}</Badge>
          )}
          {props.priorAuthRequired && (
            <Badge variant="outline">Prior Auth Required</Badge>
          )}
          {props.jCode && (
            <Badge variant="outline" className="font-mono">
              {props.jCode}
            </Badge>
          )}
          {props.rxcui && (
            <Badge variant="secondary" className="font-mono">
              RxCUI: {props.rxcui}
            </Badge>
          )}
        </div>

        {Array.isArray(data?.clinicalCriteria) && data.clinicalCriteria.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Clinical Criteria
            </p>
            {(data.clinicalCriteria as Array<{ type: string; description: string }>).map(
              (c, i) => (
                <p key={i} className="text-sm">
                  <span className="text-muted-foreground">{c.type}:</span>{' '}
                  {c.description}
                </p>
              ),
            )}
          </div>
        )}

        {props.sourceExcerpt && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Source
                </p>
                {props.sourcePage != null && (
                  <span className="text-xs text-muted-foreground font-mono">
                    p.{props.sourcePage}
                  </span>
                )}
                {props.sourceSection && (
                  <span className="text-xs text-muted-foreground">
                    {props.sourceSection}
                  </span>
                )}
              </div>
              <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground italic">
                {props.sourceExcerpt}
              </blockquote>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
