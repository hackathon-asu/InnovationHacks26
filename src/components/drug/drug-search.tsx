'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useDrugSearch } from '@/hooks/use-drug-search';

export function DrugSearch() {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useDrugSearch(query);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by drug name or J-code (e.g. Humira, J0135)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-lg"
      />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((drug, i) => (
            <Link key={i} href={drug.rxcui ? `/drugs/${drug.rxcui}` : '#'}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">
                        {drug.brandName ?? drug.genericName ?? 'Unknown'}
                      </p>
                      {drug.genericName && drug.brandName && (
                        <p className="text-sm text-muted-foreground">
                          {drug.genericName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {drug.jCode && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {drug.jCode}
                        </Badge>
                      )}
                      {drug.rxcui && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          RxCUI: {drug.rxcui}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {drug.planCount} plan{drug.planCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {query.length >= 2 && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No drugs found matching &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
