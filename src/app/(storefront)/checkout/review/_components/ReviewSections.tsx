'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { CheckoutStepper } from '@/components/checkout-stepper';
import { Button } from '@/components/ui/button';
import type { PaymentIntent, PaymentStatus } from '@/entities/payment/schemas';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { GuardedButton } from '@/shared/ui/GuardedButton';

export function ReviewHeader({ orderId }: { orderId: string }) {
  const t = useTranslations('checkout.review');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CheckoutStepper current="review" className="mb-4 mt-4" />
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <p className="text-xs text-muted-foreground">{t('orderId', { orderId })}</p>
    </div>
  );
}

export function ReviewAddressSection({ lines }: { lines: string[] }) {
  const t = useTranslations('checkout.review');
  return (
    <section className="space-y-2 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">{t('addressTitle')}</h2>
      <div className="space-y-1 text-sm text-muted-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

/** "Metode Pembayaran" card: pay button, gateway links, expiry countdown and payment errors. */
export function PaymentMethodPanel({
  isPending,
  payDisabled,
  payHintId,
  payHintMessage,
  onPayNow,
  onPrefetch,
  paymentIntent,
  onOpenGateway,
  onStartWatcher,
  watcherActive,
  countdownLabel,
  paymentExpired,
  pendingTooLong,
  supportLink,
  paymentError,
}: {
  isPending: boolean;
  payDisabled: boolean;
  payHintId?: string;
  payHintMessage?: string | null;
  onPayNow: () => Promise<void> | void;
  onPrefetch: () => void;
  paymentIntent: PaymentIntent | null;
  onOpenGateway: () => void;
  onStartWatcher: () => void;
  watcherActive: boolean;
  countdownLabel: string | null;
  paymentExpired: boolean;
  pendingTooLong: boolean;
  supportLink: string;
  paymentError: string | null;
}) {
  const t = useTranslations('checkout.review.payment');
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <div className="space-y-3">
        <GuardedButton
          type="button"
          size="lg"
          onClick={onPayNow}
          disabled={payDisabled}
          isLoading={isPending}
          loadingLabel={t('processing')}
          aria-describedby={payHintId}
          className="min-h-[44px] px-6"
          onFocus={onPrefetch}
          onMouseEnter={onPrefetch}
        >
          {t('payNow')}
        </GuardedButton>
        <div className="flex justify-start">
          <DelayedLoader
            active={isPending}
            label={t('connecting')}
            className="text-xs text-muted-foreground"
          />
        </div>
        {payDisabled && payHintMessage ? (
          <DisabledHint id={payHintId} message={payHintMessage} />
        ) : null}
        {paymentIntent?.redirectUrl || paymentIntent?.token ? (
          <div className="flex flex-wrap gap-2">
            {paymentIntent?.redirectUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={paymentIntent.redirectUrl} target="_blank" rel="noopener noreferrer">
                  {t('continueToPayment')}
                </a>
              </Button>
            ) : null}
            {paymentIntent?.token ? (
              <Button type="button" size="sm" onClick={onOpenGateway}>
                {t('openPayment')}
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onStartWatcher} disabled={watcherActive}>
              {t('alreadyPaid')}
            </Button>
          </div>
        ) : null}
        {paymentIntent?.expiresAt ? (
          <p className="text-xs text-muted-foreground">
            {t('payBefore', {
              deadline: new Date(paymentIntent.expiresAt).toLocaleString('id-ID'),
            })}
          </p>
        ) : null}
        {countdownLabel ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {paymentExpired ? (
              <p>{t('expired')}</p>
            ) : (
              <p>
                {t.rich('remaining', {
                  countdown: countdownLabel,
                  strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                })}
              </p>
            )}
            <p className="mt-1 text-[11px] text-amber-800">{t('deadlineHint')}</p>
            {pendingTooLong ? (
              <p className="mt-2">
                <a href={supportLink} className="font-medium underline">
                  {t('contactSupport')}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        {paymentIntent?.token ? (
          <p className="text-xs text-muted-foreground">
            {t.rich('token', {
              token: paymentIntent.token,
              mono: (chunks) => <span className="font-mono">{chunks}</span>,
            })}
          </p>
        ) : null}
      </div>
      {paymentError ? (
        <div
          className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {paymentError}
        </div>
      ) : null}
    </section>
  );
}

export function PaymentStatusErrorAlert({
  message,
  orderId,
  failedStatus,
  onRetry,
}: {
  message: string;
  orderId: string;
  failedStatus: PaymentStatus['status'] | null;
  onRetry: () => void;
}) {
  const t = useTranslations('checkout.review.statusError');
  return (
    <div
      className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      role="alert"
    >
      <p>{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {t('retry')}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/checkout/failed?orderId=${encodeURIComponent(orderId)}${
              failedStatus ? `&status=${failedStatus}` : ''
            }`}
          >
            {t('viewDetails')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
