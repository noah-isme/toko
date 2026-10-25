'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { AdminProductStatus, AdminStockStatus } from '@/entities/admin/types';
import { cn } from '@/lib/utils';

const PRODUCT_STATUS_CLASSES: Record<AdminProductStatus, string> = {
  published: 'bg-green-100 text-green-800 border-green-200',
  draft: 'bg-muted text-muted-foreground',
  archived: 'bg-slate-200 text-slate-700 border-slate-300',
};

const STOCK_STATUS_CLASSES: Record<AdminStockStatus, string> = {
  in: 'bg-green-100 text-green-800 border-green-200',
  low: 'bg-amber-100 text-amber-800 border-amber-200',
  out: 'bg-red-100 text-red-800 border-red-200',
};

export function ProductStatusBadge({ status }: { status: AdminProductStatus }) {
  const t = useTranslations('admin.catalog.status');
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', PRODUCT_STATUS_CLASSES[status])}
      data-testid="product-status-badge"
      data-status={status}
    >
      {t(status)}
    </Badge>
  );
}

/** Stock level from the API classification; `children` replaces the default label. */
export function StockStatusBadge({
  status,
  children,
}: {
  status: AdminStockStatus;
  children?: React.ReactNode;
}) {
  const t = useTranslations('admin.catalog.stockStatus');
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', STOCK_STATUS_CLASSES[status])}
      data-testid="stock-status-badge"
      data-stock-status={status}
    >
      {children ?? t(status)}
    </Badge>
  );
}
