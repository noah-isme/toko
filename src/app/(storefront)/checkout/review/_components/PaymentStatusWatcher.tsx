'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { usePaymentStatusQuery } from '@/entities/payment/api/hooks';
import type { PaymentStatus } from '@/entities/payment/schemas';

const failureStatuses: Array<PaymentStatus['status']> = ['FAILED', 'EXPIRED', 'REFUNDED'];

export interface PaymentStatusWatcherProps {
  orderId: string;
  active: boolean;
  manualCheckToken: number;
  onPaid: () => void;
  onFailed: (status: PaymentStatus['status']) => void;
  onError: (message: string) => void;
}

export function PaymentStatusWatcher({
  orderId,
  active,
  manualCheckToken,
  onPaid,
  onFailed,
  onError,
}: PaymentStatusWatcherProps) {
  const t = useTranslations('checkout.review.watcher');
  const statusQuery = usePaymentStatusQuery(orderId, { enabled: active && Boolean(orderId) });
  const initialCheckTokenRef = useRef(manualCheckToken);

  useEffect(() => {
    if (active) {
      initialCheckTokenRef.current = manualCheckToken;
    }
  }, [active, manualCheckToken]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (statusQuery.data?.status === 'PAID') {
      onPaid();
      return;
    }

    if (statusQuery.data && failureStatuses.includes(statusQuery.data.status)) {
      onFailed(statusQuery.data.status);
    }
  }, [active, onFailed, onPaid, statusQuery.data]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (statusQuery.isError) {
      onError(t('checkError'));
    }
  }, [active, onError, statusQuery.isError, t]);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (manualCheckToken > initialCheckTokenRef.current) {
      void statusQuery.refetch();
    }
  }, [manualCheckToken, active, statusQuery]);

  if (!active) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-4" role="status" aria-live="polite">
      <p className="font-medium">{t('checking')}</p>
      {statusQuery.isFetching ? (
        <p className="text-sm text-muted-foreground">{t('contacting')}</p>
      ) : null}
      {statusQuery.data ? (
        <p className="text-sm text-muted-foreground">
          {t.rich('current', {
            status: statusQuery.data.status,
            strong: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
          })}
        </p>
      ) : null}
    </div>
  );
}
