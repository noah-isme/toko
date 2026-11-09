'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { InlineBar, ReportSection, StatTile, useReportFormat } from './report-parts';

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
import { useAdminSalesByCategoryReport } from '@/entities/admin/hooks';
import type { AdminReportCategoryRow, AdminReportRangeParams } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

export function categoryLabel(
  row: Pick<AdminReportCategoryRow, 'categoryId' | 'categoryName'>,
  uncategorized: string,
) {
  return row.categoryId === null ? uncategorized : row.categoryName;
}

/**
 * Item-level sales per category: headline totals, then one table row per
 * category with an inline share bar. Categorised rows drill into the product
 * report filtered to that category.
 */
export function SalesByCategoryReport({
  params,
  enabled,
  actions,
  onSelectCategory,
}: {
  params: AdminReportRangeParams;
  enabled: boolean;
  actions?: React.ReactNode;
  onSelectCategory: (category: { id: string; name: string }) => void;
}) {
  const t = useTranslations('admin.reports');
  const { currency } = useAdminFormat();
  const { percent, count } = useReportFormat();
  const report = useAdminSalesByCategoryReport(params, { enabled });
  const data = report.data;

  if (!enabled) return null;
  if (report.isLoading) return <AdminLoading label={t('loading')} />;
  if (report.isError) {
    return <AdminError error={report.error} onRetry={() => void report.refetch()} />;
  }
  if (!data) return null;

  const maxRevenue = Math.max(0, ...data.rows.map((row) => row.revenue));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={t('category.totalRevenue')} value={currency(data.totalRevenue)} />
        <StatTile label={t('category.totalUnits')} value={count(data.totalUnits)} />
        <StatTile label={t('category.categories')} value={count(data.rows.length)} />
      </div>

      <ReportSection title={t('tabs.category')} actions={actions}>
        {data.rows.length === 0 ? (
          <AdminEmpty message={t('category.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('category.columns.category')}</TableHead>
                  <TableHead className="min-w-[180px]">{t('category.columns.share')}</TableHead>
                  <TableHead className="text-right">{t('category.columns.units')}</TableHead>
                  <TableHead className="text-right">{t('category.columns.orders')}</TableHead>
                  <TableHead className="text-right">{t('category.columns.revenue')}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t('tabs.product')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => {
                  const name = categoryLabel(row, t('category.uncategorized'));
                  return (
                    <TableRow key={row.categoryId ?? 'uncategorized'}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InlineBar value={row.revenue} max={maxRevenue} />
                          <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                            {percent(row.share)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{count(row.unitsSold)}</TableCell>
                      <TableCell className="text-right font-mono">{count(row.orders)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {currency(row.revenue)}
                      </TableCell>
                      <TableCell>
                        {row.categoryId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('category.viewProducts', { category: name })}
                            title={t('category.viewProducts', { category: name })}
                            onClick={() => onSelectCategory({ id: row.categoryId as string, name })}
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportSection>
    </div>
  );
}
