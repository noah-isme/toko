'use client';

import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminError, AdminLoading, AdminPageHeader } from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { datetimeLocalToIso } from '@/entities/admin/datetime-local';
import { useAdminProducts } from '@/entities/admin/hooks';
import { useCreateAdminFlashSale } from '@/entities/admin/hooks';
import type { AdminFlashSaleStatus } from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

const NONE = '__none__';

const FLASH_SALE_STATUSES: AdminFlashSaleStatus[] = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED'];

interface FlashSaleItemRow {
  productId: string;
  salePrice: number;
  stockLimit: number | '';
}

interface FlashSaleFormValues {
  name: string;
  slug: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED';
  startsAt: string;
  endsAt: string;
  items: FlashSaleItemRow[];
}

const EMPTY_VALUES: FlashSaleFormValues = {
  name: '',
  slug: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  items: [],
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `''` means no limit; anything else must be a whole number >= 1. */
function isValidStockLimit(raw: number | ''): boolean {
  if (raw === '') return true;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1;
}

function formValuesToInput(values: FlashSaleFormValues) {
  const items = values.items
    .filter((item) => item.productId !== NONE)
    .map((item) => ({
      productId: item.productId,
      salePrice: Math.max(0, Math.round(item.salePrice)),
      // Validated in handleSubmit; empty is sent as an explicit null (no limit).
      stockLimit: item.stockLimit === '' ? null : Number(item.stockLimit),
    }));

  return {
    name: values.name.trim(),
    slug: values.slug.trim() || slugify(values.name),
    status: values.status,
    startsAt: datetimeLocalToIso(values.startsAt),
    endsAt: datetimeLocalToIso(values.endsAt),
    items,
  };
}

export default function FlashSaleNewPage() {
  const t = useTranslations('admin.flashSales');
  const tCommon = useTranslations('admin.common');
  const { currency } = useAdminFormat();
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = useState<FlashSaleFormValues>(EMPTY_VALUES);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useAdminProducts({ limit: 1000 });
  const createMutation = useCreateAdminFlashSale();

  const update = <K extends keyof FlashSaleFormValues>(key: K, value: FlashSaleFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (
    index: number,
    field: keyof FlashSaleItemRow,
    value: FlashSaleItemRow[typeof field],
  ) => {
    setValues((current) => {
      const next = [...current.items];
      next[index] = { ...next[index], [field]: value };
      return { ...current, items: next };
    });
  };

  const addItem = () => {
    setValues((current) => ({
      ...current,
      items: [...current.items, { productId: NONE, salePrice: 0, stockLimit: '' }],
    }));
  };

  const removeItem = (index: number) => {
    setValues((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError(t('form.errors.nameRequired'));
      return;
    }
    if (!values.startsAt || !values.endsAt) {
      setError(t('form.errors.datesRequired'));
      return;
    }
    if (new Date(values.endsAt) <= new Date(values.startsAt)) {
      setError(t('form.errors.endBeforeStart'));
      return;
    }
    if (values.items.filter((i) => i.productId !== NONE).length === 0) {
      setError(t('form.errors.productRequired'));
      return;
    }
    if (values.items.some((i) => i.productId !== NONE && i.salePrice <= 0)) {
      setError(t('form.errors.salePrice'));
      return;
    }
    if (values.items.some((i) => i.productId !== NONE && !isValidStockLimit(i.stockLimit))) {
      setError(t('form.errors.stockLimitInvalid'));
      return;
    }

    try {
      const input = formValuesToInput(values);
      const result = await createMutation.mutateAsync(input);
      toast({ title: t('toast.created'), variant: 'success' });
      router.push(`/admin/flash-sales/${result.id}/edit`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('form.errors.createFailed');
      setError(message);
      toast({ title: t('toast.createFailed'), description: message, variant: 'destructive' });
    }
  };

  if (productsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={t('new.title')} description={t('new.description')} />
        <AdminLoading label={t('loadingProducts')} />
      </div>
    );
  }

  if (productsQuery.isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={t('new.title')} description={t('new.description')} />
        <AdminError error={productsQuery.error} onRetry={() => void productsQuery.refetch()} />
      </div>
    );
  }

  const products = productsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('new.title')}
        description={t('new.description')}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/flash-sales">{tCommon('cancel')}</Link>
          </Button>
        }
      />

      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fs-name">{t('form.name')}</Label>
                <Input
                  id="fs-name"
                  value={values.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setValues((current) => ({
                      ...current,
                      name,
                      slug: slugTouched ? current.slug : slugify(name),
                    }));
                  }}
                  placeholder={t('form.namePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-slug">{t('form.slug')}</Label>
                <Input
                  id="fs-slug"
                  value={values.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update('slug', event.target.value);
                  }}
                  placeholder={t('form.slugPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-status">{tCommon('status')}</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) =>
                    update('status', value as FlashSaleFormValues['status'])
                  }
                >
                  <SelectTrigger id="fs-status">
                    <SelectValue placeholder={t('form.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {FLASH_SALE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-starts-at">{t('form.startsAt')}</Label>
                <Input
                  id="fs-starts-at"
                  type="datetime-local"
                  value={values.startsAt}
                  onChange={(event) => update('startsAt', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fs-ends-at">{t('form.endsAt')}</Label>
                <Input
                  id="fs-ends-at"
                  type="datetime-local"
                  value={values.endsAt}
                  onChange={(event) => update('endsAt', event.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('form.items')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={products.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('form.addProduct')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('form.noProducts')}</p>
            ) : values.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('form.noItems')}</p>
            ) : (
              values.items.map((item, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">{t('form.item', { index: index + 1 })}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('form.removeItem', { index: index + 1 })}
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-product-${index}`}>{t('form.product')}</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => updateItem(index, 'productId', value)}
                      >
                        <SelectTrigger id={`fs-item-product-${index}`}>
                          <SelectValue placeholder={t('form.selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{t('form.selectProductOption')}</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {t('form.productOption', {
                                title: product.title,
                                price: currency(product.price),
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-sale-price-${index}`}>{t('form.salePrice')}</Label>
                      <Input
                        id={`fs-item-sale-price-${index}`}
                        type="number"
                        min={0}
                        step={100}
                        value={item.salePrice}
                        onChange={(event) =>
                          updateItem(index, 'salePrice', Number(event.target.value))
                        }
                        placeholder={t('form.salePricePlaceholder')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fs-item-stock-limit-${index}`}>{t('form.stockLimit')}</Label>
                      <Input
                        id={`fs-item-stock-limit-${index}`}
                        type="number"
                        value={item.stockLimit}
                        onChange={(event) => updateItem(index, 'stockLimit', event.target.value)}
                        placeholder={t('form.stockLimitPlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground">{t('form.stockLimitHint')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('new.submitting')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('new.submit')}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/flash-sales')}
            disabled={createMutation.isPending}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
