'use client';

import { useFormatter } from 'next-intl';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Locale-aware percent and tenant-day formatting for the reports. */
export function useReportFormat() {
  const format = useFormatter();
  return {
    /** A 0..n fraction as a percent, e.g. 0.4567 -> `45,7%` / `45.7%`. */
    percent: (fraction: number) =>
      format.number(fraction, { style: 'percent', maximumFractionDigits: 1 }),
    count: (value: number) => format.number(value),
    /**
     * A tenant-local `YYYY-MM-DD` as a short date. Formatted in UTC so the
     * calendar day never shifts with the viewer's timezone.
     */
    day: (day: string, long = false) =>
      format.dateTime(new Date(`${day}T00:00:00Z`), {
        day: 'numeric',
        month: 'short',
        ...(long ? { year: 'numeric' } : {}),
        timeZone: 'UTC',
      }),
  };
}

/** A headline number with an optional caption, as used across the admin dashboard. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/** Report section card with a title and right-aligned actions. */
export function ReportSection({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** A thin horizontal bar (single series) scaled to `max`; decorative, the value is in text nearby. */
export function InlineBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted" aria-hidden="true">
      <div className={className ?? 'h-2 rounded-full bg-primary'} style={{ width: `${width}%` }} />
    </div>
  );
}
