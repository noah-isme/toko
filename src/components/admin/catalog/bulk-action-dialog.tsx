'use client';

/**
 * Bulk price / stock / status for the selected products: edit, review, then
 * apply as one all-or-nothing request. A 422 marks the offending products (via
 * `onRowErrors`); a 409 CONFLICT is a lock race and can simply be retried.
 */
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  bulkRowErrors,
  groupRowErrorsByProduct,
  isRetryableConflict,
} from '@/entities/admin/catalog-errors';
import {
  useAdminInventory,
  useBulkUpdatePrice,
  useBulkUpdateStatus,
  useBulkUpdateStock,
} from '@/entities/admin/hooks';
import type {
  AdminInventoryItem,
  AdminProduct,
  AdminProductStatus,
  BulkPriceApplyTo,
  BulkPriceItem,
  BulkRowError,
  BulkStockItem,
} from '@/entities/admin/types';
import { useAdminFormat } from '@/entities/admin/use-admin-format';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast';

export type BulkKind = 'price' | 'stock' | 'status';

type CompareMode = 'keep' | 'set' | 'clear';
type StockMode = 'adjust' | 'set';

const STATUSES: AdminProductStatus[] = ['published', 'draft', 'archived'];

/** Builds the request items; `itemProductIds[i]` is the product item `i` came from. */
export function buildStockItems(
  products: readonly AdminProduct[],
  inventory: readonly AdminInventoryItem[],
  mode: StockMode,
  value: number,
): { items: BulkStockItem[]; itemProductIds: string[]; skipped: AdminProduct[] } {
  const items: BulkStockItem[] = [];
  const itemProductIds: string[] = [];
  const skipped: AdminProduct[] = [];
  for (const product of products) {
    const variants = inventory.filter((row) => row.productId === product.id);
    if (variants.length === 0) skipped.push(product);
    for (const variant of variants) {
      items.push(
        mode === 'set'
          ? { variantId: variant.variantId, stock: value }
          : { variantId: variant.variantId, delta: value },
      );
      itemProductIds.push(product.id);
    }
  }
  return { items, itemProductIds, skipped };
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
}) {
  const id = `${name}-${value}`;
  return (
    <div className="flex items-start gap-2">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <div>
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function BulkActionDialog({
  kind,
  products,
  onClose,
  onRowErrors,
  onApplied,
}: {
  kind: BulkKind | null;
  products: AdminProduct[];
  onClose: () => void;
  /** Called with error messages per product id after a 422; an empty map clears them. */
  onRowErrors: (errors: Map<string, string[]>) => void;
  onApplied: () => void;
}) {
  const t = useTranslations('admin.catalog.bulk');
  const tStatus = useTranslations('admin.catalog.status');
  const tCommon = useTranslations('admin.common');
  const { currency } = useAdminFormat();
  const { toast } = useToast();
  const formId = useId();

  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [validation, setValidation] = useState<string | null>(null);
  const [failure, setFailure] = useState<
    | { type: 'rejected'; lines: string[] }
    | { type: 'conflict' }
    | { type: 'error'; message: string }
    | null
  >(null);

  const [price, setPrice] = useState('');
  const [applyTo, setApplyTo] = useState<BulkPriceApplyTo>('both');
  const [compareMode, setCompareMode] = useState<CompareMode>('keep');
  const [compareValue, setCompareValue] = useState('');
  const [stockMode, setStockMode] = useState<StockMode>('adjust');
  const [stockValue, setStockValue] = useState('');
  const [status, setStatus] = useState<AdminProductStatus>('published');

  const inventory = useAdminInventory({}, { enabled: kind === 'stock' });
  const priceMutation = useBulkUpdatePrice();
  const stockMutation = useBulkUpdateStock();
  const statusMutation = useBulkUpdateStatus();
  const pending = priceMutation.isPending || stockMutation.isPending || statusMutation.isPending;

  const count = products.length;
  const stockNumber = Number(stockValue);
  const stockPlan = useMemo(
    () =>
      kind === 'stock' && inventory.data
        ? buildStockItems(
            products,
            inventory.data,
            stockMode,
            Number.isInteger(stockNumber) ? stockNumber : 0,
          )
        : null,
    [kind, inventory.data, products, stockMode, stockNumber],
  );

  const reset = () => {
    setStep('edit');
    setValidation(null);
    setFailure(null);
    setPrice('');
    setApplyTo('both');
    setCompareMode('keep');
    setCompareValue('');
    setStockMode('adjust');
    setStockValue('');
    setStatus('published');
  };

  const close = () => {
    if (pending) return;
    reset();
    onClose();
  };

  const isMoney = (value: string) => /^\d+$/.test(value.trim());

  const validate = (): string | null => {
    if (kind === 'price') {
      if (!isMoney(price)) return t('invalidPrice');
      if (compareMode === 'set' && !isMoney(compareValue)) return t('invalidPrice');
    }
    if (kind === 'stock') {
      if (!/^-?\d+$/.test(stockValue.trim())) return t('invalidStock');
      if (stockMode === 'set' && stockNumber < 0) return t('invalidStockSet');
      if (stockMode === 'adjust' && stockNumber === 0) return t('invalidStock');
      if (!stockPlan || stockPlan.items.length === 0) return t('stock.variantsFailed');
    }
    return null;
  };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validate();
    setValidation(problem);
    if (!problem) {
      setFailure(null);
      setStep('confirm');
    }
  };

  const describeRow = (row: BulkRowError) =>
    t.has(`rowErrors.${row.code}` as never) ? t(`rowErrors.${row.code}` as never) : row.message;

  const apply = async () => {
    if (!kind) return;
    let itemProductIds: string[] = [];
    setFailure(null);
    onRowErrors(new Map());
    try {
      let updated = 0;
      if (kind === 'price') {
        const items: BulkPriceItem[] = products.map((product) => ({
          productId: product.id,
          price: Number(price),
          applyTo,
          ...(compareMode === 'set' ? { compareAt: Number(compareValue) } : {}),
          ...(compareMode === 'clear' ? { compareAt: null } : {}),
        }));
        itemProductIds = products.map((product) => product.id);
        updated = (await priceMutation.mutateAsync(items)).updated;
      } else if (kind === 'stock' && stockPlan) {
        itemProductIds = stockPlan.itemProductIds;
        updated = (await stockMutation.mutateAsync(stockPlan.items)).updated;
      } else if (kind === 'status') {
        itemProductIds = products.map((product) => product.id);
        updated = (
          await statusMutation.mutateAsync(
            products.map((product) => ({ productId: product.id, status })),
          )
        ).updated;
      }
      toast({ title: t('success', { count: updated }), variant: 'success' });
      reset();
      onApplied();
    } catch (error) {
      const rows = bulkRowErrors(error);
      if (rows) {
        const { byProduct, unmatched } = groupRowErrorsByProduct(rows, itemProductIds);
        const messages = new Map<string, string[]>();
        const lines: string[] = [];
        for (const [productId, productRows] of byProduct) {
          const texts = [...new Set(productRows.map(describeRow))];
          messages.set(productId, texts);
          const title = products.find((p) => p.id === productId)?.title ?? productId;
          lines.push(`${title}: ${texts.join(' ')}`);
        }
        for (const row of unmatched) {
          lines.push(`${t('unknownItem', { index: row.index + 1 })}: ${describeRow(row)}`);
        }
        onRowErrors(messages);
        setFailure({ type: 'rejected', lines });
      } else if (isRetryableConflict(error)) {
        setFailure({ type: 'conflict' });
      } else {
        setFailure({
          type: 'error',
          message: error instanceof Error ? error.message : tCommon('unknownError'),
        });
      }
    }
  };

  const summary = (): string[] => {
    if (kind === 'price') {
      const lines = [
        t('confirmPrice', { count, price: currency(Number(price)) }),
        applyTo === 'both' ? t('confirmApplyBoth') : t('confirmApplyProduct'),
      ];
      if (compareMode === 'set')
        lines.push(t('confirmCompareSet', { price: currency(Number(compareValue)) }));
      if (compareMode === 'clear') lines.push(t('confirmCompareClear'));
      return lines;
    }
    if (kind === 'stock' && stockPlan) {
      const variants = stockPlan.items.length;
      const lines = [
        stockMode === 'set'
          ? t('confirmStockSet', { variants, value: stockNumber })
          : t('confirmStockAdjust', { variants, value: stockNumber }),
      ];
      if (stockPlan.skipped.length > 0)
        lines.push(t('stock.noVariants', { count: stockPlan.skipped.length }));
      return lines;
    }
    if (kind === 'status') return [t('confirmStatus', { count, status: tStatus(status) })];
    return [];
  };

  const title = kind ? t(`titles.${kind}`, { count }) : '';

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent data-testid="bulk-dialog">
        <DialogHeader>
          <DialogTitle>{step === 'confirm' ? t('confirmTitle') : title}</DialogTitle>
          <DialogDescription>{t('allOrNothing')}</DialogDescription>
        </DialogHeader>

        {step === 'edit' ? (
          <form id={formId} onSubmit={review} className="space-y-4" noValidate>
            {kind === 'price' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-price`}>{t('price.label')}</Label>
                  <Input
                    id={`${formId}-price`}
                    inputMode="numeric"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    aria-invalid={validation ? true : undefined}
                    autoFocus
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t('price.applyTo')}</legend>
                  <RadioOption
                    name={`${formId}-apply`}
                    value="both"
                    checked={applyTo === 'both'}
                    onChange={(value) => setApplyTo(value as BulkPriceApplyTo)}
                    label={t('price.applyBoth')}
                  />
                  <RadioOption
                    name={`${formId}-apply`}
                    value="product"
                    checked={applyTo === 'product'}
                    onChange={(value) => setApplyTo(value as BulkPriceApplyTo)}
                    label={t('price.applyProduct')}
                    hint={t('price.applyProductHint')}
                  />
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t('price.compareAt')}</legend>
                  {(['keep', 'set', 'clear'] as const).map((mode) => (
                    <RadioOption
                      key={mode}
                      name={`${formId}-compare`}
                      value={mode}
                      checked={compareMode === mode}
                      onChange={(value) => setCompareMode(value as CompareMode)}
                      label={t(
                        mode === 'keep'
                          ? 'price.compareKeep'
                          : mode === 'set'
                            ? 'price.compareSet'
                            : 'price.compareClear',
                      )}
                    />
                  ))}
                  {compareMode === 'set' ? (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor={`${formId}-compare-value`}>{t('price.compareValue')}</Label>
                      <Input
                        id={`${formId}-compare-value`}
                        inputMode="numeric"
                        value={compareValue}
                        onChange={(event) => setCompareValue(event.target.value)}
                      />
                    </div>
                  ) : null}
                </fieldset>
              </>
            ) : null}

            {kind === 'stock' ? (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t('stock.mode')}</legend>
                  <RadioOption
                    name={`${formId}-stock-mode`}
                    value="adjust"
                    checked={stockMode === 'adjust'}
                    onChange={(value) => setStockMode(value as StockMode)}
                    label={t('stock.modeAdjust')}
                    hint={t('stock.adjustHint')}
                  />
                  <RadioOption
                    name={`${formId}-stock-mode`}
                    value="set"
                    checked={stockMode === 'set'}
                    onChange={(value) => setStockMode(value as StockMode)}
                    label={t('stock.modeSet')}
                    hint={t('stock.setHint')}
                  />
                </fieldset>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-stock`}>{t('stock.value')}</Label>
                  <Input
                    id={`${formId}-stock`}
                    inputMode="numeric"
                    value={stockValue}
                    onChange={(event) => setStockValue(event.target.value)}
                    aria-invalid={validation ? true : undefined}
                    autoFocus
                  />
                </div>
                {inventory.isLoading ? (
                  <p
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    role="status"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('stock.loadingVariants')}
                  </p>
                ) : inventory.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {t('stock.variantsFailed')}
                  </p>
                ) : stockPlan && stockPlan.skipped.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('stock.noVariants', { count: stockPlan.skipped.length })}
                  </p>
                ) : null}
              </>
            ) : null}

            {kind === 'status' ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('status.label')}</legend>
                {STATUSES.map((value) => (
                  <RadioOption
                    key={value}
                    name={`${formId}-status`}
                    value={value}
                    checked={status === value}
                    onChange={(next) => setStatus(next as AdminProductStatus)}
                    label={tStatus(value)}
                  />
                ))}
                <p className="text-xs text-muted-foreground">{t('status.hint')}</p>
              </fieldset>
            ) : null}

            {validation ? (
              <p className="text-sm text-destructive" role="alert" data-testid="bulk-validation">
                {validation}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="space-y-3" data-testid="bulk-confirm">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {summary().map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {failure ? (
              <div
                role="alert"
                data-testid="bulk-failure"
                className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-medium">
                    {failure.type === 'rejected'
                      ? t('rejected')
                      : failure.type === 'conflict'
                        ? t('conflict')
                        : t('failed')}
                  </p>
                  {failure.type === 'rejected' ? (
                    <ul className="list-disc pl-4">
                      {failure.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {failure.type === 'error' ? <p>{failure.message}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className={cn('gap-2')}>
          {step === 'edit' ? (
            <>
              <Button type="button" variant="outline" onClick={close}>
                {tCommon('cancel')}
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={kind === 'stock' && inventory.isLoading}
              >
                {t('review')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFailure(null);
                  setStep('edit');
                }}
                disabled={pending}
              >
                {t('back')}
              </Button>
              {failure?.type === 'rejected' ? (
                <Button type="button" onClick={close}>
                  {tCommon('cancel')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void apply()}
                  disabled={pending}
                  aria-busy={pending || undefined}
                  data-testid="bulk-apply"
                >
                  {pending ? t('applying') : failure?.type === 'conflict' ? t('retry') : t('apply')}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
