'use client';

import Link from 'next/link';

import { CheckoutStepper } from '@/components/checkout-stepper';
import { Button } from '@/components/ui/button';
import type { PaymentIntent, PaymentStatus } from '@/entities/payment/schemas';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { GuardedButton } from '@/shared/ui/GuardedButton';

export function ReviewHeader({ orderId }: { orderId: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Review Pesanan</h1>
      <CheckoutStepper current="review" className="mb-4 mt-4" />
      <p className="text-sm text-muted-foreground">
        Pastikan detail pesanan Anda sudah benar sebelum melanjutkan ke pembayaran.
      </p>
      <p className="text-xs text-muted-foreground">Order ID: {orderId}</p>
    </div>
  );
}

export function ReviewAddressSection({ lines }: { lines: string[] }) {
  return (
    <section className="space-y-2 rounded-lg border p-6">
      <h2 className="text-lg font-semibold">Alamat Pengiriman</h2>
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
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Metode Pembayaran</h2>
        <p className="text-sm text-muted-foreground">
          Kami menggunakan Midtrans Snap untuk memproses pembayaran secara aman.
        </p>
      </div>
      <div className="space-y-3">
        <GuardedButton
          type="button"
          size="lg"
          onClick={onPayNow}
          disabled={payDisabled}
          isLoading={isPending}
          loadingLabel="Memproses pembayaran…"
          aria-describedby={payHintId}
          className="min-h-[44px] px-6"
          onFocus={onPrefetch}
          onMouseEnter={onPrefetch}
        >
          Bayar Sekarang
        </GuardedButton>
        <div className="flex justify-start">
          <DelayedLoader
            active={isPending}
            label="Menghubungi penyedia pembayaran…"
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
                  Lanjut ke Pembayaran
                </a>
              </Button>
            ) : null}
            {paymentIntent?.token ? (
              <Button type="button" size="sm" onClick={onOpenGateway}>
                Buka Pembayaran
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onStartWatcher} disabled={watcherActive}>
              Saya Sudah Membayar
            </Button>
          </div>
        ) : null}
        {paymentIntent?.expiresAt ? (
          <p className="text-xs text-muted-foreground">
            Selesaikan pembayaran sebelum{' '}
            {new Date(paymentIntent.expiresAt).toLocaleString('id-ID')}.
          </p>
        ) : null}
        {countdownLabel ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {paymentExpired ? (
              <p>Waktu pembayaran telah berakhir. Silakan buat ulang pembayaran.</p>
            ) : (
              <p>
                Sisa waktu pembayaran: <span className="font-semibold">{countdownLabel}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-amber-800">
              Pastikan Anda menyelesaikan pembayaran sebelum batas waktu.
            </p>
            {pendingTooLong ? (
              <p className="mt-2">
                <a href={supportLink} className="font-medium underline">
                  Hubungi CS
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        {paymentIntent?.token ? (
          <p className="text-xs text-muted-foreground">
            Token pembayaran: <span className="font-mono">{paymentIntent.token}</span>
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
  return (
    <div
      className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      role="alert"
    >
      <p>{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Coba Lagi
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link
            href={`/checkout/failed?orderId=${encodeURIComponent(orderId)}${
              failedStatus ? `&status=${failedStatus}` : ''
            }`}
          >
            Lihat Detail
          </Link>
        </Button>
      </div>
    </div>
  );
}
