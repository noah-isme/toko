/** @jsxImportSource react */
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

import { OrderSummary } from '../_components/OrderSummary';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { OrderDraft } from '@/entities/checkout/api/hooks';
import { loadOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { isPaymentMethod } from '@/lib/api/constants';
import { cn } from '@/lib/utils';

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<CheckoutFailedSkeleton />}>
      <CheckoutFailedContent />
    </Suspense>
  );
}

const SUPPORT_EMAIL = 'support@toko.com';

function CheckoutFailedContent() {
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') ?? '';
  const status = searchParams.get('status');
  const reason = searchParams.get('reason');

  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const storedDraft = loadOrderDraft(orderId);
    if (storedDraft) {
      // Draft lives in client-only sessionStorage; reading it post-mount avoids
      // a hydration mismatch, so syncing into state here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderDraft(storedDraft);
    }
  }, [orderId]);

  if (!orderId) {
    return (
      <EmptyState
        title={t('failed.missing.title')}
        description={t('failed.missing.description')}
        action={{ label: t('failed.missing.action'), onClick: () => router.push('/cart') }}
      />
    );
  }

  const totals = orderDraft?.totals ?? null;

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">{t('failed.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich(status ? 'failed.status' : 'failed.statusUnknown', {
            orderId,
            status: status ?? '',
            strong: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
          })}
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {reason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900">{t('failed.reasonTitle')}</h3>
            <p className="mt-1 text-sm text-red-800">{reason}</p>
          </div>
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="font-semibold text-yellow-900">{t('failed.whatToDo')}</h3>
          <ul className="mt-2 space-y-1 text-sm text-yellow-800">
            <li>{t('failed.tips.retry')}</li>
            <li>{t('failed.tips.balance')}</li>
            <li>{t('failed.tips.support')}</li>
          </ul>
        </div>

        {orderDraft && (
          <>
            <section className="space-y-3 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">{t('orderDetails.shippingTitle')}</h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">
                  {orderDraft.address.receiverName} • {orderDraft.address.phone}
                </p>
                <p className="text-muted-foreground">
                  {orderDraft.address.addressLine1}
                  {orderDraft.address.addressLine2 ? `, ${orderDraft.address.addressLine2}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {orderDraft.address.city}, {orderDraft.address.province}{' '}
                  {orderDraft.address.postalCode}
                </p>
                <p className="text-muted-foreground">{orderDraft.address.country}</p>
              </div>
            </section>

            {orderDraft.paymentMethod && (
              <section className="space-y-3 rounded-lg border p-6">
                <h2 className="text-lg font-semibold">{t('orderDetails.paymentTitle')}</h2>
                <p className="text-sm text-muted-foreground">
                  {isPaymentMethod(orderDraft.paymentMethod)
                    ? t(`payment.methods.${orderDraft.paymentMethod}.label`)
                    : orderDraft.paymentMethod}
                </p>
              </section>
            )}
          </>
        )}

        {totals ? <OrderSummary totals={totals} /> : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href={`/checkout/review?orderId=${encodeURIComponent(orderId)}`}>
              {t('failed.retry')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/cart">{t('failed.backToCart')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">{t('failed.shopFirst')}</Link>
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <p>
            {t.rich('failed.help', {
              email: SUPPORT_EMAIL,
              link: (chunks) => (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-primary hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckoutFailedSkeleton() {
  return (
    <div className="space-y-6 text-center">
      <div className={cn('mx-auto h-8 w-72 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      <div className={cn('mx-auto h-6 w-80 rounded bg-muted animate-pulse', 'prm:no-anim')} />
      <div
        className={cn(
          'mx-auto h-48 w-full max-w-2xl rounded-lg border bg-muted animate-pulse',
          'prm:no-anim',
        )}
      />
    </div>
  );
}
