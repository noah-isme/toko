'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { CheckoutStepper } from '@/components/checkout-stepper';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { GuardedButton } from '@/shared/ui/GuardedButton';

const NOTES_MAX_LENGTH = 500;

export function CheckoutHeader() {
  const t = useTranslations('checkout.header');
  return (
    <div>
      <Breadcrumbs
        className="mb-3"
        items={[
          { label: t('breadcrumbHome'), href: '/' },
          { label: t('breadcrumbCart'), href: '/cart' },
          { label: t('breadcrumbCheckout') },
        ]}
      />
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CheckoutStepper current="address" className="mt-4" />
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
    </div>
  );
}

/** Shipping options card. The (lazy) options list is passed as `children`. */
export function ShippingOptionsSection({
  isPending,
  lastQuoteLabel,
  isUsingCachedQuote,
  refreshDisabled,
  onRefresh,
  children,
}: {
  isPending: boolean;
  lastQuoteLabel: string | null;
  isUsingCachedQuote: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('checkout.shipping');
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshDisabled}
        >
          {isPending ? t('refreshing') : t('refresh')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending
          ? t('recalculating')
          : lastQuoteLabel
            ? t(isUsingCachedQuote ? 'lastQuote' : 'updatedQuote', { time: lastQuoteLabel })
            : t('autoUpdate')}
      </p>
      {children}
    </section>
  );
}

/** Payment method card. The (lazy) selector is passed as `children`. */
export function PaymentMethodSection({ children }: { children: ReactNode }) {
  const t = useTranslations('checkout.payment');
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      {children}
    </section>
  );
}

export function OrderNotesSection({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations('checkout.notes');
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <textarea
        className="min-h-[80px] w-full resize-none rounded-lg border border-input bg-background p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={t('placeholder')}
        maxLength={NOTES_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-right text-xs text-muted-foreground">
        {t('counter', { count: value.length, max: NOTES_MAX_LENGTH })}
      </p>
    </section>
  );
}

/** Error message, "Bayar Sekarang" button (or out-of-stock notice), loader and disabled hint. */
export function CheckoutProceedActions({
  errorMessage,
  hasOutOfStockItem,
  proceedLabel,
  isProcessing,
  disabled,
  hintId,
  hintMessage,
  onCheckout,
  onPrefetch,
}: {
  errorMessage?: string | null;
  hasOutOfStockItem: boolean;
  proceedLabel: string;
  isProcessing: boolean;
  disabled: boolean;
  hintId?: string;
  hintMessage?: string | null;
  onCheckout: () => void;
  onPrefetch: () => void;
}) {
  const t = useTranslations('checkout.proceed');
  return (
    <>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <div className="flex justify-end">
        {hasOutOfStockItem ? (
          <div className="rounded border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {t('outOfStock')}
          </div>
        ) : (
          <GuardedButton
            type="button"
            size="lg"
            aria-label={proceedLabel}
            onClick={onCheckout}
            disabled={disabled}
            isLoading={isProcessing}
            loadingLabel={t('processing')}
            aria-describedby={hintId}
            className="min-h-[44px] px-6"
            onFocus={onPrefetch}
            onMouseEnter={onPrefetch}
          >
            {t('payNow')}
          </GuardedButton>
        )}
      </div>
      <div className="flex justify-end">
        <DelayedLoader
          active={isProcessing}
          label={t('connecting')}
          className="text-xs text-muted-foreground"
        />
      </div>
      {disabled && hintMessage ? <DisabledHint id={hintId} message={hintMessage} /> : null}
    </>
  );
}
