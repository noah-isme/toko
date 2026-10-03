'use client';

import type { ReactNode } from 'react';

import { CheckoutStepper } from '@/components/checkout-stepper';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { GuardedButton } from '@/shared/ui/GuardedButton';

export function CheckoutHeader() {
  return (
    <div>
      <Breadcrumbs
        className="mb-3"
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Keranjang', href: '/cart' },
          { label: 'Checkout' },
        ]}
      />
      <h1 className="text-2xl font-bold">Checkout</h1>
      <CheckoutStepper current="address" className="mt-4" />
      <p className="text-sm text-muted-foreground">
        Enter your shipping details to see available delivery options.
      </p>
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
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Shipping Options</h2>
          <p className="text-sm text-muted-foreground">
            Choose the delivery service that suits you best.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshDisabled}
        >
          {isPending ? 'Memperbarui...' : 'Perbarui ongkir'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending
          ? 'Menghitung ulang ongkir...'
          : lastQuoteLabel
            ? `${isUsingCachedQuote ? 'Ongkir terakhir' : 'Ongkir diperbarui'} ${lastQuoteLabel}`
            : 'Ongkir diperbarui otomatis saat alamat atau keranjang berubah.'}
      </p>
      {children}
    </section>
  );
}

/** Payment method card. The (lazy) selector is passed as `children`. */
export function PaymentMethodSection({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Payment Method</h2>
        <p className="text-sm text-muted-foreground">Select how you want to pay for your order.</p>
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
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Catatan Pesanan (Opsional)</h2>
        <p className="text-sm text-muted-foreground">
          Tambahkan instruksi khusus untuk pesanan Anda (mis. “Telepon sebelum dikirim”, “Tinggalkan
          di depan pintu”).
        </p>
      </div>
      <textarea
        className="min-h-[80px] w-full resize-none rounded-lg border border-input bg-background p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Tulis catatan Anda di sini... (maks 500 karakter)"
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-right text-xs text-muted-foreground">{value.length}/500</p>
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
  return (
    <>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <div className="flex justify-end">
        {hasOutOfStockItem ? (
          <div className="rounded border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            Beberapa produk di keranjang Anda tidak tersedia atau stok habis.
          </div>
        ) : (
          <GuardedButton
            type="button"
            size="lg"
            aria-label={proceedLabel}
            onClick={onCheckout}
            disabled={disabled}
            isLoading={isProcessing}
            loadingLabel="Memproses pesanan…"
            aria-describedby={hintId}
            className="min-h-[44px] px-6"
            onFocus={onPrefetch}
            onMouseEnter={onPrefetch}
          >
            Bayar Sekarang
          </GuardedButton>
        )}
      </div>
      <div className="flex justify-end">
        <DelayedLoader
          active={isProcessing}
          label="Menghubungkan ke gateway pembayaran…"
          className="text-xs text-muted-foreground"
        />
      </div>
      {disabled && hintMessage ? <DisabledHint id={hintId} message={hintMessage} /> : null}
    </>
  );
}
