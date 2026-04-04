'use client';

import { useState, useEffect } from 'react';
import type { DrugSearchResult } from '@/lib/types/drug';

export function useDrugSearch(query: string) {
  const [results, setResults] = useState<DrugSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/drugs/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => setResults(data.drugs))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [query]);

  return { results, isLoading };
}
