import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardStats, getRecentChanges } from '@/lib/db/queries';

async function StatsCards() {
  const stats = await getDashboardStats();

  const cards = [
    { label: 'Drugs Tracked', value: stats.totalDrugs },
    { label: 'Plans', value: stats.totalPlans },
    { label: 'Policies', value: stats.totalPolicies },
    { label: 'Changes', value: stats.totalChanges },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight font-mono">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function RecentChanges() {
  const changes = await getRecentChanges(5);

  if (changes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recent changes found.</p>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{change.payerName}</span>
              <Badge variant="secondary" className="text-xs">
                {change.planName}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                v{change.versionNumber}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {change.changeSummary ?? change.policyTitle}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {change.effectiveDate}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChangesLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drug coverage tracking across major US payers.
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <StatsCards />
      </Suspense>

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Recent Policy Changes
        </h2>
        <Suspense fallback={<ChangesLoading />}>
          <RecentChanges />
        </Suspense>
      </div>
    </div>
  );
}
