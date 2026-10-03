'use client';

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
      onError('Tidak dapat memeriksa status pembayaran. Silakan coba lagi.');
    }
  }, [active, onError, statusQuery.isError]);

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
      <p className="font-medium">Memeriksa status pembayaran...</p>
      {statusQuery.isFetching ? (
        <p className="text-sm text-muted-foreground">Menghubungi penyedia pembayaran.</p>
      ) : null}
      {statusQuery.data ? (
        <p className="text-sm text-muted-foreground">
          Status saat ini:{' '}
          <span className="font-semibold text-foreground">{statusQuery.data.status}</span>
        </p>
      ) : null}
    </div>
  );
}
