'use client';

import { useState, useEffect } from 'react';
import type { ComparisonEntry } from '@/lib/types/comparison';

export function useComparison(drugName: string | null) {
  const [comparisons, setComparisons] = useState<ComparisonEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!drugName) {
      setComparisons([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/drugs/${encodeURIComponent(drugName)}/coverage`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setComparisons(data.comparisons ?? []))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [drugName]);

  return { comparisons, isLoading };
}
