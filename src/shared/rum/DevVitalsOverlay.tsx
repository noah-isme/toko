'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { subscribeToRumMetrics, type RumMetricPayload } from './transport';
import { useReportWebVitals } from './useReportWebVitals';

import { cn } from '@/lib/utils';

const ratingClassMap: Record<string, string> = {
  good: 'text-emerald-500',
  'needs-improvement': 'text-amber-500',
  poor: 'text-red-500',
};

const formatValue = (metric: string, value: number) => {
  if (metric === 'CLS') {
    return value.toFixed(3);
  }

  if (metric === 'INP') {
    return `${Math.round(value)} ms`;
  }

  if (metric === 'TTFB') {
    return `${Math.round(value)} ms`;
  }

  if (metric === 'LCP' || metric === 'FCP') {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return value.toFixed(2);
};

const shouldEnableOverlay = () => process.env.NODE_ENV === 'development';

export const DevVitalsOverlay = () => {
  useReportWebVitals();

  const searchParams = useSearchParams();
  const enabled = useMemo(() => searchParams?.get('vitals') === '1', [searchParams]);
  const [metrics, setMetrics] = useState<Record<string, RumMetricPayload>>({});

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return subscribeToRumMetrics((payload) => {
      setMetrics((previous) => ({ ...previous, [payload.metric]: payload }));
    });
  }, [enabled]);

  if (!shouldEnableOverlay() || !enabled) {
    return null;
  }

  const entries = Object.values(metrics).sort((first, second) =>
    first.metric.localeCompare(second.metric),
  );

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[1000] max-w-xs border border-border/60 rounded-lg bg-background/80 p-4 text-sm shadow-lg backdrop-blur',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 font-semibold">Web Vitals</div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">Menunggu metrik…</p>
      ) : (
        <dl className="space-y-1">
          {entries.map((item) => {
            const rating = item.rating ?? 'unknown';
            const ratingClass = ratingClassMap[rating] ?? 'text-foreground';

            return (
              <div key={item.metric} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.metric}
                </dt>
                <dd className={cn('font-mono text-sm', ratingClass)}>
                  {formatValue(item.metric, item.value)}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};

export default DevVitalsOverlay;
