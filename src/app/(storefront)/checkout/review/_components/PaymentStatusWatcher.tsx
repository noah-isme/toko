'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
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

export function PaymentStatusWatcher({ active, ...props }: PaymentStatusWatcherProps) {
  if (!active || !props.orderId) {
    return null;
  }

  // Mounting only while active gives every activation a fresh polling session
  // (back-off and max-duration window start when watching starts).
  return <ActivePaymentStatusWatcher {...props} />;
}

function ActivePaymentStatusWatcher({
  orderId,
  manualCheckToken,
  onPaid,
  onFailed,
  onError,
}: Omit<PaymentStatusWatcherProps, 'active'>) {
  const t = useTranslations('checkout.review.watcher');
  const statusQuery = usePaymentStatusQuery(orderId, { enabled: Boolean(orderId) });
  const initialCheckTokenRef = useRef(manualCheckToken);
  const { restart } = statusQuery;

  useEffect(() => {
    if (statusQuery.data?.status === 'PAID') {
      onPaid();
      return;
    }

    if (statusQuery.data && failureStatuses.includes(statusQuery.data.status)) {
      onFailed(statusQuery.data.status);
    }
  }, [onFailed, onPaid, statusQuery.data]);

  useEffect(() => {
    if (statusQuery.isError) {
      onError(t('checkError'));
    }
  }, [onError, statusQuery.isError, t]);

  useEffect(() => {
    if (manualCheckToken > initialCheckTokenRef.current) {
      initialCheckTokenRef.current = manualCheckToken;
      void restart();
    }
  }, [manualCheckToken, restart]);

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-4" role="status" aria-live="polite">
      <p className="font-medium">{statusQuery.timedOut ? t('stillWaiting') : t('checking')}</p>
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
      {statusQuery.timedOut ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('stillWaitingDescription')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={statusQuery.isFetching}
            onClick={() => void restart()}
          >
            {t('checkAgain')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
