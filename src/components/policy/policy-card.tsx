import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PolicyCardProps {
  id: string;
  policyNumber: string;
  title: string;
  effectiveDate: string;
  version: number | null;
  status: string;
  planName: string;
  lineOfBusiness: string;
  payerName: string;
}

export function PolicyCard(props: PolicyCardProps) {
  return (
    <Link href={`/policies/${props.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {props.payerName}
            </CardTitle>
            <Badge
              variant={props.status === 'active' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {props.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium leading-tight">{props.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {props.planName}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {props.lineOfBusiness}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              #{props.policyNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Effective: {props.effectiveDate}</span>
            {props.version && <span>v{props.version}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
