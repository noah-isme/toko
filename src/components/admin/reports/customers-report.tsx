'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';

import { ReportSection, StatTile, useReportFormat } from './report-parts';

import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminCustomersReport } from '@/entities/admin/hooks';
import { addDays } from '@/entities/admin/report-range';
import type { AdminReportCustomersDay, AdminReportRangeParams } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { cn } from '@/lib/utils';

/** Series colors in fixed categorical order (see DESIGN.md chart tokens). */
const SERIES = {
  new: 'bg-chart-1',
  returning: 'bg-chart-2',
  guest: 'bg-chart-3',
} as const;

/**
 * Every tenant-local day in `[from, to)`, filling days without customer orders
 * with zeros so the time axis stays continuous.
 */
export function fillDays(
  from: string,
  to: string,
  daily: AdminReportCustomersDay[],
): AdminReportCustomersDay[] {
  const byDay = new Map(daily.map((row) => [row.day, row]));
  const first = from.slice(0, 10);
  const last = to.slice(0, 10);
  const days: AdminReportCustomersDay[] = [];
  // An RFC3339 `to` that is not a local midnight still includes its own day.
  const end = to.slice(11, 19) === '00:00:00' ? last : addDays(last, 1);
  for (let day = first; day < end && days.length <= 400; day = addDays(day, 1)) {
    days.push(
      byDay.get(day) ?? { day, newCustomers: 0, returningCustomers: 0, orders: 0, revenue: 0 },
    );
  }
  return days;
}

function Swatch({ className }: { className: string }) {
  return (
    <span
      className={cn('inline-block h-3 w-3 shrink-0 rounded-sm', className)}
      aria-hidden="true"
    />
  );
}

export function CustomersReport({
  params,
  enabled,
  actions,
}: {
  params: AdminReportRangeParams;
  enabled: boolean;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('admin.reports.customers');
  const tReports = useTranslations('admin.reports');
  const { currency } = useAdminFormat();
  const { percent, count } = useReportFormat();
  const report = useAdminCustomersReport(params, { enabled });
  const data = report.data;

  if (!enabled) return null;
  if (report.isLoading) return <AdminLoading label={tReports('loading')} />;
  if (report.isError) {
    return <AdminError error={report.error} onRetry={() => void report.refetch()} />;
  }
  if (!data) return null;

  const totalRevenue = data.revenueFromNew + data.revenueFromReturning + data.guestRevenue;
  const segments = [
    {
      key: 'new',
      label: t('segmentNew'),
      value: data.revenueFromNew,
      orders: data.ordersFromNew,
      color: SERIES.new,
    },
    {
      key: 'returning',
      label: t('segmentReturning'),
      value: data.revenueFromReturning,
      orders: data.ordersFromReturning,
      color: SERIES.returning,
    },
    {
      key: 'guest',
      label: t('segmentGuest'),
      value: data.guestRevenue,
      orders: data.guestOrders,
      color: SERIES.guest,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('new')}
          value={count(data.newCustomers)}
          hint={t('ordersCount', { count: data.ordersFromNew })}
        />
        <StatTile
          label={t('returning')}
          value={count(data.returningCustomers)}
          hint={t('ordersCount', { count: data.ordersFromReturning })}
        />
        <StatTile
          label={t('repeatRate')}
          value={percent(data.repeatRate)}
          hint={`${t('total')}: ${count(data.totalCustomers)}`}
        />
        <StatTile
          label={t('guestOrders')}
          value={count(data.guestOrders)}
          hint={currency(data.guestRevenue)}
        />
      </div>

      <ReportSection title={t('revenueSplitTitle')}>
        {totalRevenue === 0 ? (
          <AdminEmpty message={t('empty')} />
        ) : (
          <div className="space-y-4">
            <div
              className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
              aria-hidden="true"
            >
              {segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <div
                    key={segment.key}
                    className={cn('h-full first:rounded-l-full last:rounded-r-full', segment.color)}
                    style={{ width: `${(segment.value / totalRevenue) * 100}%` }}
                  />
                ))}
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {segments.map((segment) => (
                <li key={segment.key} className="flex items-start gap-2 text-sm">
                  <Swatch className={cn('mt-1', segment.color)} />
                  <div>
                    <p className="font-medium">
                      {segment.label}{' '}
                      <span className="font-normal text-muted-foreground">
                        {percent(segment.value / totalRevenue)}
                      </span>
                    </p>
                    <p className="font-mono">{currency(segment.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('ordersCount', { count: segment.orders })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ReportSection>

      <ReportSection title={t('dailyTitle')} actions={actions}>
        {data.daily.length === 0 ? (
          <AdminEmpty message={t('empty')} />
        ) : (
          <DailyCustomersChart days={fillDays(data.from, data.to, data.daily)} />
        )}
      </ReportSection>
    </div>
  );
}

/**
 * Stacked columns (new below returning) per tenant-local day. Hover or the
 * arrow keys move a readout that names the day and every value; the table
 * view lists the same rows.
 */
function DailyCustomersChart({ days }: { days: AdminReportCustomersDay[] }) {
  const t = useTranslations('admin.reports.customers');
  const { currency } = useAdminFormat();
  const { count, day: formatDay } = useReportFormat();
  const readoutId = useId();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = useMemo(
    () => Math.max(1, ...days.map((row) => row.newCustomers + row.returningCustomers)),
    [days],
  );
  const totals = useMemo(
    () =>
      days.reduce(
        (sum, row) => ({
          new: sum.new + row.newCustomers,
          returning: sum.returning + row.returningCustomers,
        }),
        { new: 0, returning: 0 },
      ),
    [days],
  );

  const activeRow = active === null ? null : days[active];
  const describe = (row: AdminReportCustomersDay) =>
    t('barLabel', {
      day: formatDay(row.day, true),
      new: row.newCustomers,
      returning: row.returningCustomers,
      orders: row.orders,
      revenue: currency(row.revenue),
    });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const current = active ?? last;
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(0, current - 1)
        : event.key === 'ArrowRight'
          ? Math.min(last, current + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-4 text-sm" aria-label={t('chartLabel')}>
          <li className="flex items-center gap-2">
            <Swatch className={SERIES.new} />
            {t('columns.new')} <span className="font-mono">{count(totals.new)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Swatch className={SERIES.returning} />
            {t('columns.returning')} <span className="font-mono">{count(totals.returning)}</span>
          </li>
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={showTable}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? t('hideTable') : t('showTable')}
        </Button>
      </div>

      <p
        id={readoutId}
        className="min-h-5 text-sm text-muted-foreground"
        aria-live="polite"
        data-testid="customers-chart-readout"
      >
        {activeRow ? describe(activeRow) : t('dailyNote')}
      </p>

      <div className="flex gap-2">
        <div
          className="flex h-40 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          <span>{count(max)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            role="group"
            tabIndex={0}
            aria-label={t('chartLabel')}
            aria-describedby={readoutId}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((current) => current ?? days.length - 1)}
            onBlur={() => setActive(null)}
            onMouseLeave={() => setActive(null)}
            className="flex h-40 items-stretch gap-px rounded-sm border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="customers-chart"
          >
            {days.map((row, index) => {
              const total = row.newCustomers + row.returningCustomers;
              return (
                <div
                  key={row.day}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col justify-end',
                    active === index && 'bg-muted',
                  )}
                  onMouseEnter={() => setActive(index)}
                  data-day={row.day}
                >
                  {total > 0 ? (
                    <div
                      className="flex flex-col gap-px overflow-hidden rounded-t-sm"
                      style={{ height: `${(total / max) * 100}%` }}
                    >
                      {row.returningCustomers > 0 ? (
                        <div
                          className={SERIES.returning}
                          style={{ flexGrow: row.returningCustomers }}
                        />
                      ) : null}
                      {row.newCustomers > 0 ? (
                        <div className={SERIES.new} style={{ flexGrow: row.newCustomers }} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div
            className="mt-1 flex justify-between text-xs text-muted-foreground"
            aria-hidden="true"
          >
            <span>{formatDay(days[0].day)}</span>
            {days.length > 1 ? <span>{formatDay(days[days.length - 1].day)}</span> : null}
          </div>
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.day')}</TableHead>
                <TableHead className="text-right">{t('columns.new')}</TableHead>
                <TableHead className="text-right">{t('columns.returning')}</TableHead>
                <TableHead className="text-right">{t('columns.orders')}</TableHead>
                <TableHead className="text-right">{t('columns.revenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days
                .filter((row) => row.orders > 0)
                .map((row) => (
                  <TableRow key={row.day}>
                    <TableCell>{formatDay(row.day, true)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {count(row.newCustomers)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {count(row.returningCustomers)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{count(row.orders)}</TableCell>
                    <TableCell className="text-right font-mono">{currency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
