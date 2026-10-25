'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportAction, ImportResult, ImportRowError } from '@/entities/admin/types';
import { cn } from '@/lib/utils';

const ACTION_CLASSES: Record<ImportAction, string> = {
  create: 'bg-blue-100 text-blue-800 border-blue-200',
  create_variant: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  update: 'bg-green-100 text-green-800 border-green-200',
  unchanged: 'bg-muted text-muted-foreground',
  reject: 'bg-red-100 text-red-800 border-red-200',
};

const SUMMARY_KEYS = [
  'total',
  'create',
  'createVariant',
  'update',
  'unchanged',
  'rejected',
] as const;

/** Rows that will write something (or did, after a commit). */
export function importChangeCount(result: ImportResult): number {
  return result.rows.filter((row) => row.action !== 'unchanged' && row.action !== 'reject').length;
}

function formatValue(value: unknown, empty: string): string {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Summary counts and the per-row table of a dry run or a committed import. */
export function ImportPreview({ result }: { result: ImportResult }) {
  const t = useTranslations('admin.catalog.import');
  const toggleId = useId();
  const [showUnchanged, setShowUnchanged] = useState(false);
  const rows = showUnchanged
    ? result.rows
    : result.rows.filter((row) => row.action !== 'unchanged');

  const describeError = (error: ImportRowError) =>
    t.has(`rowErrors.${error.code}` as never)
      ? (t as unknown as (key: string, values: Record<string, string>) => string)(
          `rowErrors.${error.code}`,
          { field: error.field },
        )
      : error.message;

  return (
    <div className="space-y-4" data-testid="import-preview">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SUMMARY_KEYS.map((key) => (
          <div
            key={key}
            className={cn(
              'rounded-md border p-3',
              key === 'rejected' &&
                result.summary.rejected > 0 &&
                'border-destructive/40 bg-destructive/5',
            )}
          >
            <dt className="text-xs text-muted-foreground">{t(`summary.${key}`)}</dt>
            <dd className="text-xl font-semibold" data-testid={`import-summary-${key}`}>
              {result.summary[key]}
            </dd>
          </div>
        ))}
      </dl>

      {result.summary.unchanged > 0 ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id={toggleId}
            checked={showUnchanged}
            onCheckedChange={(checked) => setShowUnchanged(checked === true)}
          />
          <Label htmlFor={toggleId} className="font-normal">
            {t('showUnchanged')}
          </Label>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="max-h-[32rem] overflow-auto rounded-md border">
          <Table aria-label={t('tableLabel')}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('columns.row')}</TableHead>
                <TableHead>{t('columns.sku')}</TableHead>
                <TableHead>{t('columns.product')}</TableHead>
                <TableHead>{t('columns.action')}</TableHead>
                <TableHead>{t('columns.changes')}</TableHead>
                <TableHead>{t('columns.errors')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const changes = Object.entries(row.changes);
                return (
                  <TableRow
                    key={row.row}
                    data-testid="import-row"
                    data-action={row.action}
                    className={cn(row.action === 'reject' && 'bg-destructive/5')}
                  >
                    <TableCell className="font-mono text-sm">{row.row}</TableCell>
                    <TableCell className="font-mono text-sm">{row.sku || '-'}</TableCell>
                    <TableCell className="text-sm">{row.slug ?? '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('font-medium', ACTION_CLASSES[row.action])}
                      >
                        {t(`actions.${row.action}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {changes.length === 0 ? (
                        <span className="text-muted-foreground">{t('noChanges')}</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {changes.map(([field, change]) => (
                            <li key={field}>
                              <span className="font-mono text-xs">{field}</span>:{' '}
                              {formatValue(change.from, t('empty'))} →{' '}
                              <strong>{formatValue(change.to, t('empty'))}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-destructive">
                      {row.errors.length > 0 ? (
                        <ul className="space-y-0.5" data-testid="import-row-errors">
                          {row.errors.map((error) => (
                            <li key={`${error.field}-${error.code}`}>
                              <span className="font-mono text-xs">{error.field}</span>:{' '}
                              {describeError(error)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
