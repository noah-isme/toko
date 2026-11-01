'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TableHead } from '@/components/ui/table';
import type { SortDirection } from '@/entities/admin/product-list-params';
import type { AdminProductSortField } from '@/entities/admin/types';
import { cn } from '@/lib/utils';

/**
 * A column header that sorts the list. The button keeps the column name as its
 * accessible name; the header announces the current order through `aria-sort`.
 */
export function SortableTableHead({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: AdminProductSortField;
  label: string;
  sort?: { field: AdminProductSortField; direction: SortDirection };
  onSort: (field: AdminProductSortField) => void;
  className?: string;
}) {
  const t = useTranslations('admin.catalog.sort');
  const active = sort?.field === field;
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground',
        )}
        title={t('by', { column: label })}
        data-testid={`sort-${field}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  );
}
