'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useId, useState } from 'react';

import { useAdminErrorMessage } from '@/components/admin/admin-access-ui';
import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { StockStatusBadge } from '@/components/admin/catalog/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  inventorySettingsOf,
  useAdminInventory,
  useStoreSettings,
  useUpdateAdminInventory,
  useUpdateLowStockThreshold,
} from '@/entities/admin/hooks';
import { STOCK_STATUSES } from '@/entities/admin/product-list-params';
import type { AdminInventoryItem, AdminStockStatus } from '@/entities/admin/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const MAX_THRESHOLD = 1_000_000;

/** `?stockStatus=low|out|in`, with the backend's `?lowStock=true` alias. */
function parseFilter(params: URLSearchParams): AdminStockStatus | undefined {
  const value = params.get('stockStatus');
  if (value && (STOCK_STATUSES as string[]).includes(value)) return value as AdminStockStatus;
  return params.get('lowStock') === 'true' ? 'low' : undefined;
}

/** Older backends omit `stockStatus`; classify with the same rule as the API. */
function stockStatusOf(item: AdminInventoryItem): AdminStockStatus {
  if (item.stockStatus) return item.stockStatus;
  const threshold = item.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  if (item.stock <= 0) return 'out';
  return threshold > 0 && item.stock <= threshold ? 'low' : 'in';
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <InventoryPageContent />
    </Suspense>
  );
}

function ThresholdCard() {
  const t = useTranslations('admin.inventory.threshold');
  const settings = useStoreSettings();
  const update = useUpdateLowStockThreshold();
  const { toast } = useToast();
  const inputId = useId();
  const current =
    inventorySettingsOf(settings.data).lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const value = draft ?? String(current);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const threshold = Number(value);
    if (!/^\d+$/.test(value.trim()) || threshold > MAX_THRESHOLD) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    try {
      await update.mutateAsync({ threshold, current: settings.data });
      setDraft(null);
      toast({ title: t('saved'), variant: 'success' });
    } catch (error) {
      toast({
        title: t('failed'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {settings.isError ? (
          <AdminError error={settings.error} onRetry={() => void settings.refetch()} />
        ) : (
          <form onSubmit={save} className="flex flex-wrap items-end gap-2" noValidate>
            <div className="space-y-2">
              <Label htmlFor={inputId}>{t('label')}</Label>
              <Input
                id={inputId}
                className="w-32"
                inputMode="numeric"
                value={value}
                disabled={settings.isLoading}
                onChange={(event) => setDraft(event.target.value)}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? `${inputId}-error` : undefined}
                data-testid="inventory-threshold-input"
              />
            </div>
            <Button
              type="submit"
              disabled={settings.isLoading || update.isPending}
              data-testid="inventory-threshold-save"
            >
              {t('save')}
            </Button>
            {invalid ? (
              <p id={`${inputId}-error`} className="w-full text-sm text-destructive" role="alert">
                {t('invalid')}
              </p>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryPageContent() {
  const t = useTranslations('admin.inventory');
  const tStock = useTranslations('admin.catalog.stockStatus');
  const tCommon = useTranslations('admin.common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseFilter(new URLSearchParams(searchParams.toString()));
  const query = useAdminInventory(filter ? { stockStatus: filter } : {});
  const update = useUpdateAdminInventory();
  const { toast } = useToast();
  const adminErrorMessage = useAdminErrorMessage();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Normalise the `lowStock=true` alias to the canonical parameter.
  useEffect(() => {
    if (searchParams.get('lowStock') === 'true' && !searchParams.get('stockStatus')) {
      router.replace(`${pathname}?stockStatus=low` as never, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const setFilter = (next: AdminStockStatus | undefined) => {
    router.replace((next ? `${pathname}?stockStatus=${next}` : pathname) as never, {
      scroll: false,
    });
  };

  const save = async (id: string) => {
    const stock = Number(drafts[id]);
    if (!/^\d+$/.test((drafts[id] ?? '').trim()) || !Number.isInteger(stock) || stock < 0) {
      toast({ title: t('toast.invalid'), variant: 'destructive' });
      return;
    }
    try {
      await update.mutateAsync({ id, data: { stock } });
      toast({ title: t('toast.updated'), variant: 'success' });
      setDrafts((current) => ({ ...current, [id]: '' }));
    } catch (error) {
      toast({
        title: t('toast.failed'),
        description: adminErrorMessage(error, String(error)),
        variant: 'destructive',
      });
    }
  };

  const items = query.data ?? [];
  const options: (AdminStockStatus | undefined)[] = [undefined, 'low', 'out', 'in'];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />

      <ThresholdCard />

      <div
        role="group"
        aria-label={t('filterLabel')}
        className="flex flex-wrap gap-2"
        data-testid="inventory-filter"
      >
        {options.map((option) => (
          <Button
            key={option ?? 'all'}
            type="button"
            size="sm"
            variant={filter === option ? 'default' : 'outline'}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {option ? tStock(option) : t('filterAll')}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <AdminLoading label={t('loading')} />
      ) : query.error ? (
        <AdminError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y" aria-label={t('title')}>
              {items.map((item) => {
                const status = stockStatusOf(item);
                const threshold = item.lowStockThreshold;
                return (
                  <li
                    key={item.variantId}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                    data-testid="inventory-row"
                    data-stock-status={status}
                  >
                    <div>
                      <Link
                        href={`/admin/products/${item.productId}/edit` as never}
                        className="font-medium hover:underline"
                      >
                        {item.productTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.sku || item.variantId}</p>
                    </div>
                    <div className="space-y-1 md:text-right">
                      <div className="flex items-center gap-2 md:justify-end">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            status !== 'in' && 'text-destructive',
                          )}
                        >
                          {t('available', { count: item.stock })}
                        </span>
                        <StockStatusBadge status={status} />
                      </div>
                      {threshold !== undefined ? (
                        <p className="text-xs text-muted-foreground">
                          {threshold > 0 ? t('thresholdHint', { threshold }) : t('thresholdOff')}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        aria-label={t('stockFor', { title: item.productTitle })}
                        className="w-24"
                        inputMode="numeric"
                        placeholder={String(item.stock)}
                        value={drafts[item.variantId] ?? ''}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.variantId]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => void save(item.variantId)}
                        disabled={update.isPending}
                      >
                        {tCommon('save')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {items.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                {filter ? t('emptyFiltered') : t('empty')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
