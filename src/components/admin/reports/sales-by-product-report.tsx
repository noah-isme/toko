'use client';

import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { ReportSection, useReportFormat } from './report-parts';

import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminSalesByCategoryReport,
  useAdminSalesByProductReport,
} from '@/entities/admin/hooks';
import type { AdminReportRangeParams } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';

export const PRODUCT_REPORT_PAGE_SIZE = 20;
const ALL = 'all';

/**
 * Paginated item-level sales per product, optionally filtered to one category
 * (the drill-down target of the category report). Remount it (via `key`) when
 * the range or category changes so paging restarts at page 1.
 */
export function SalesByProductReport({
  params,
  enabled,
  category,
  onCategoryChange,
  actions,
}: {
  params: AdminReportRangeParams;
  enabled: boolean;
  category: { id: string; name: string } | null;
  onCategoryChange: (category: { id: string; name: string } | null) => void;
  actions?: React.ReactNode;
}) {
  const t = useTranslations('admin.reports');
  const tCommon = useTranslations('admin.common');
  const { currency } = useAdminFormat();
  const { count } = useReportFormat();
  const filterId = useId();
  const [page, setPage] = useState(1);

  const report = useAdminSalesByProductReport(
    { ...params, page, limit: PRODUCT_REPORT_PAGE_SIZE, categoryId: category?.id },
    { enabled },
  );
  // Filter options: categories that sold in this range (shared, cached query).
  const categories = useAdminSalesByCategoryReport(params, { enabled });
  const options = (categories.data?.rows ?? []).flatMap((row) =>
    row.categoryId ? [{ id: row.categoryId, name: row.categoryName }] : [],
  );
  if (category && !options.some((option) => option.id === category.id)) options.unshift(category);

  if (!enabled) return null;

  const totalItems = report.data?.pagination.totalItems ?? 0;
  const perPage = report.data?.pagination.perPage ?? PRODUCT_REPORT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const filter = (
    <div className="flex items-center gap-2">
      <Label htmlFor={filterId} className="text-sm text-muted-foreground">
        {t('product.filterLabel')}
      </Label>
      <Select
        value={category?.id ?? ALL}
        onValueChange={(value) =>
          onCategoryChange(
            value === ALL ? null : (options.find((option) => option.id === value) ?? null),
          )
        }
      >
        <SelectTrigger id={filterId} className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('product.allCategories')}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <ReportSection
      title={t('tabs.product')}
      actions={
        <>
          {filter}
          {actions}
        </>
      }
    >
      {category ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <span>{t('product.filteredBy', { category: category.name })}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onCategoryChange(null)}
          >
            <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {t('product.clearFilter')}
          </Button>
        </div>
      ) : null}

      {report.isLoading ? (
        <AdminLoading label={t('loading')} />
      ) : report.isError ? (
        <AdminError error={report.error} onRetry={() => void report.refetch()} />
      ) : totalItems === 0 ? (
        <AdminEmpty message={t('product.empty')} />
      ) : (
        <>
          <div className="overflow-x-auto" aria-busy={report.isFetching || undefined}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('product.columns.product')}</TableHead>
                  <TableHead>{t('product.columns.category')}</TableHead>
                  <TableHead className="text-right">{t('product.columns.units')}</TableHead>
                  <TableHead className="text-right">{t('product.columns.orders')}</TableHead>
                  <TableHead className="text-right">{t('product.columns.revenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data?.data.map((row, index) => (
                  <TableRow key={row.productId ?? `${row.slug}-${index}`}>
                    <TableCell className="text-muted-foreground">
                      {(page - 1) * perPage + index + 1}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{row.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">{row.slug}</p>
                    </TableCell>
                    <TableCell>
                      {row.categoryId === null ? t('category.uncategorized') : row.categoryName}
                    </TableCell>
                    <TableCell className="text-right font-mono">{count(row.unitsSold)}</TableCell>
                    <TableCell className="text-right font-mono">{count(row.orders)}</TableCell>
                    <TableCell className="text-right font-mono">{currency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <nav className="mt-4 flex items-center justify-between" aria-label={t('tabs.product')}>
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {tCommon('pageOf', { page, total: totalPages })}
                {report.isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {tCommon('previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {tCommon('next')}
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </ReportSection>
  );
}
