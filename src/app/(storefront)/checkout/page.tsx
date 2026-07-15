'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { OrderSummary } from './_components/OrderSummary';
import { PaymentMethodSelector } from './_components/PaymentMethodSelector';
import { ShippingOptions } from './_components/ShippingOptions';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAddressListQuery } from '@/entities/address/hooks';
import { getGuestAddressOwnerId } from '@/entities/address/storage';
import type { Address as SavedAddress } from '@/entities/address/types';
import { AddressBook } from '@/entities/address/ui/AddressBook';
import type { CartWithPromo } from '@/entities/cart/cache';
import { useCheckoutMutation, useShippingQuoteMutation } from '@/entities/checkout/api/hooks';
import type {
  Address as CheckoutAddress,
  OrderDraft,
  ShippingOption,
} from '@/entities/checkout/api/hooks';
import { saveOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { PromoField } from '@/entities/promo/ui/PromoField';
import { useCartQuery } from '@/lib/api/hooks';
import type { PaymentMethod } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { getCheckoutProceedRule, normalizeDisabledMessage } from '@/shared/lib/disabledRules';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';
import { CheckoutSkeleton } from '@/shared/ui/skeletons/CheckoutSkeleton';
import { useCartStore } from '@/stores/cart-store';

const EMPTY_ADDRESSES: SavedAddress[] = [];

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const storedCartId = useCartStore((state) => state.cartId);
  const {
    data: cart,
    isLoading: isCartLoading,
    isFetching: isCartFetching,
  } = useCartQuery(storedCartId || undefined);
  const {
    mutateAsync: fetchShippingQuote,
    isPending: isShippingQuotePending,
    error: shippingQuoteError,
  } = useShippingQuoteMutation();
  const checkoutMutation = useCheckoutMutation();

  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(
    'bank_transfer',
  );
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isUsingCachedQuote, setIsUsingCachedQuote] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [localStoredCartId, setLocalStoredCartId] = useState<string | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [addressOwnerId, setAddressOwnerId] = useState<string | null>(null);
  const { data: addresses = EMPTY_ADDRESSES, isLoading: isAddressLoading } =
    useAddressListQuery(addressOwnerId);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [addressAnnouncement, setAddressAnnouncement] = useState('');
  const [isAddressManagerOpen, setAddressManagerOpen] = useState(false);
  const [lastQuoteUpdatedAt, setLastQuoteUpdatedAt] = useState<number | null>(null);
  const lastQuoteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const existingCartId = window.localStorage.getItem('cartId');
    if (existingCartId) {
      setLocalStoredCartId(existingCartId);
    }
    setStorageChecked(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (cart?.id) {
      window.localStorage.setItem('cartId', cart.id);
      setLocalStoredCartId(cart.id);
    }
  }, [cart?.id]);

  const activeCartId = cart?.id ?? storedCartId ?? localStoredCartId ?? null;
  const cartSignature = useMemo(() => {
    if (!cart?.items?.length) {
      return '';
    }

    return [...cart.items]
      .map((item) => `${item.productId}:${item.quantity}`)
      .sort()
      .join('|');
  }, [cart?.items]);
  const hasOutOfStockItem = useMemo(() => {
    return Boolean(
      cart?.items?.some(
        (item: any) =>
          (item.maxQuantity !== undefined && item.quantity > item.maxQuantity) ||
          (item.availableStock !== undefined && item.quantity > item.availableStock),
      ),
    );
  }, [cart?.items]);
  const quoteStorageKey = useMemo(() => {
    if (!activeCartId || !selectedAddress) {
      return null;
    }
    return `checkout:shipping-quote:${activeCartId}:${selectedAddress.id}`;
  }, [activeCartId, selectedAddress]);
  const checkoutDraftKey = useMemo(
    () => (activeCartId ? `checkout:step:${activeCartId}` : null),
    [activeCartId],
  );

  useEffect(() => {
    // If user is logged in, use their ID
    if (user) {
      setAddressOwnerId(user.id);
      return;
    }

    // Otherwise check for guest ID
    if (typeof window !== 'undefined') {
      setAddressOwnerId(getGuestAddressOwnerId());
    }
  }, [user]);

  useEffect(() => {
    if (storageChecked && !isCartLoading && (!cart || !cart.items || cart.items.length === 0)) {
      router.replace('/cart');
    }
  }, [storageChecked, isCartLoading, cart, router]);

  useEffect(() => {
    if (!quoteStorageKey || typeof window === 'undefined') {
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
      return;
    }

    const raw = window.sessionStorage.getItem(quoteStorageKey);
    if (!raw) {
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
      return;
    }

    try {
      const cached = JSON.parse(raw) as {
        cartSignature?: string;
        updatedAt?: number;
        options?: ShippingOption[];
      };
      if (cached.cartSignature && cached.cartSignature !== cartSignature) {
        setShippingOptions([]);
        setIsUsingCachedQuote(false);
        return;
      }
      if (Array.isArray(cached.options) && cached.options.length > 0) {
        setShippingOptions(cached.options);
        setLastQuoteUpdatedAt(cached.updatedAt ?? null);
        setIsUsingCachedQuote(true);
      } else {
        setShippingOptions([]);
        setIsUsingCachedQuote(false);
      }
    } catch (error) {
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
    }
  }, [cartSignature, quoteStorageKey]);

  useEffect(() => {
    if (!checkoutDraftKey || typeof window === 'undefined') {
      setDraftLoaded(true);
      return;
    }

    const raw = window.sessionStorage.getItem(checkoutDraftKey);
    if (!raw) {
      setDraftLoaded(true);
      return;
    }

    try {
      const draft = JSON.parse(raw) as {
        addressId?: string;
        shippingId?: string;
        paymentMethod?: PaymentMethod;
      };

      if (!selectedAddressId && draft.addressId) {
        setSelectedAddressId(draft.addressId);
      }
      if (!selectedShippingId && draft.shippingId) {
        setSelectedShippingId(draft.shippingId);
      }
      if (!selectedPaymentMethod && draft.paymentMethod) {
        setSelectedPaymentMethod(draft.paymentMethod);
      }
    } catch (error) {
      // ignore invalid draft payload
    } finally {
      setDraftLoaded(true);
    }
  }, [checkoutDraftKey, selectedAddressId, selectedPaymentMethod, selectedShippingId]);

  useEffect(() => {
    if (!checkoutDraftKey || typeof window === 'undefined' || !draftLoaded) {
      return;
    }

    const payload = {
      addressId: selectedAddressId ?? undefined,
      shippingId: selectedShippingId ?? undefined,
      paymentMethod: selectedPaymentMethod ?? undefined,
      updatedAt: Date.now(),
    };

    const hasAnyValue = Boolean(payload.addressId || payload.shippingId || payload.paymentMethod);

    if (hasAnyValue) {
      window.sessionStorage.setItem(checkoutDraftKey, JSON.stringify(payload));
    } else {
      window.sessionStorage.removeItem(checkoutDraftKey);
    }
  }, [checkoutDraftKey, draftLoaded, selectedAddressId, selectedPaymentMethod, selectedShippingId]);

  const requestShippingQuote = useCallback(
    async (address: SavedAddress, options: { selectDefault?: boolean } = {}) => {
      if (!activeCartId) {
        return;
      }

      lastQuoteKeyRef.current = `${activeCartId}:${address.id}:${cartSignature}`;
      try {
        const result = await fetchShippingQuote({
          cartId: activeCartId,
          address: mapAddressToCheckout(address),
        });
        const updatedAt = Date.now();
        setShippingOptions(result);
        setLastQuoteUpdatedAt(updatedAt);
        setIsUsingCachedQuote(false);
        if (typeof window !== 'undefined') {
          const storageKey = `checkout:shipping-quote:${activeCartId}:${address.id}`;
          window.sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              cartSignature,
              updatedAt,
              options: result,
            }),
          );
        }
        if (options.selectDefault) {
          setSelectedShippingId(result[0]?.id ?? null);
        }
      } catch (error) {
        console.error('Failed to refresh shipping quote', error);
      }
    },
    [activeCartId, cartSignature, fetchShippingQuote],
  );

  const handleAddressSelection = useCallback(
    async (address: SavedAddress, options: { announce?: boolean } = {}) => {
      setSelectedAddressId(address.id);
      setSelectedAddress(address);
      setSelectedShippingId(null);
      setLastQuoteUpdatedAt(null);
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
      if (options.announce !== false) {
        setAddressAnnouncement(`Alamat ${address.fullName} dipilih`);
      }
      capturePosthogEvent('checkout_address_select', {
        addressId: address.id,
        country: address.country,
        province: address.province,
      });
      if (!activeCartId) {
        return;
      }
      await requestShippingQuote(address, { selectDefault: true });
    },
    [activeCartId, requestShippingQuote],
  );

  useEffect(() => {
    if (!selectedAddress || !activeCartId) {
      setLastQuoteUpdatedAt(null);
      return;
    }

    if (isShippingQuotePending) {
      return;
    }

    const nextKey = `${activeCartId}:${selectedAddress.id}:${cartSignature}`;
    if (lastQuoteKeyRef.current === nextKey) {
      return;
    }

    void requestShippingQuote(selectedAddress);
  }, [activeCartId, cartSignature, requestShippingQuote, selectedAddress, isShippingQuotePending]);

  useEffect(() => {
    if (!addresses.length) {
      if (isAddressLoading) {
        return;
      }
      setSelectedAddress(null);
      setSelectedAddressId(null);
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
      return;
    }

    if (selectedAddressId) {
      const existing = addresses.find((item) => item.id === selectedAddressId);
      if (existing) {
        setSelectedAddress(existing);
        return;
      }
    }

    const fallback = addresses.find((item) => item.isDefault) ?? addresses[0];
    if (fallback) {
      void handleAddressSelection(fallback, { announce: false });
    }
  }, [addresses, handleAddressSelection, isAddressLoading, selectedAddressId]);

  useEffect(() => {
    const options = shippingOptions;
    if (!options.length) {
      return;
    }
    if (!options.some((option) => option.id === selectedShippingId)) {
      setSelectedShippingId(options[0]?.id ?? null);
    }
  }, [selectedShippingId, shippingOptions]);

  const selectedShippingOption = useMemo<ShippingOption | null>(() => {
    if (!shippingOptions.length) {
      return null;
    }
    return shippingOptions.find((option) => option.id === selectedShippingId) ?? null;
  }, [selectedShippingId, shippingOptions]);

  const promoAwareCart = cart as CartWithPromo | undefined;
  const promoTotals = promoAwareCart?.totals;
  const computedTotals = useMemo(() => {
    const subtotal = promoTotals?.subtotal ?? cart?.subtotal?.amount ?? 0;
    const discount = promoTotals?.discount ?? 0;
    const shipping = promoTotals?.shipping ?? selectedShippingOption?.cost ?? 0;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = promoTotals?.tax ?? Math.round(taxBase * 0.11);
    const total = promoTotals?.total ?? subtotal - discount + tax + shipping;

    return {
      subtotal,
      discount,
      tax,
      shipping,
      total,
    };
  }, [cart?.subtotal?.amount, promoTotals, selectedShippingOption]);

  const lastQuoteLabel = useMemo(() => {
    if (!lastQuoteUpdatedAt) {
      return null;
    }
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(lastQuoteUpdatedAt));
  }, [lastQuoteUpdatedAt]);

  const isProcessing = checkoutMutation.isPending;
  const proceedLabel = isProcessing ? 'Memproses pesanan…' : 'Bayar Sekarang';
  const baseProceedRule = getCheckoutProceedRule({
    hasAddress: Boolean(selectedAddress),
    hasShippingOption: Boolean(selectedShippingOption),
    isProcessing: isProcessing,
  });
  const proceedRule = normalizeDisabledMessage(
    baseProceedRule.disabled
      ? baseProceedRule
      : !selectedPaymentMethod
        ? {
            disabled: true,
            reasonCode: 'unknown',
            message: 'Pilih metode pembayaran terlebih dahulu',
          }
        : baseProceedRule,
  );
  const proceedHintDomId = useId();
  const proceedHintId = proceedRule.disabled ? proceedHintDomId : undefined;

  const handleCheckout = async () => {
    if (!activeCartId || !selectedAddress || !selectedShippingOption || !selectedPaymentMethod) {
      return;
    }

    try {
      const result = await checkoutMutation.mutateAsync({
        cartId: activeCartId,
        shippingAddressId: selectedAddress.id,
        shippingService: selectedShippingOption.id,
        shippingCost: selectedShippingOption.cost,
        paymentMethod: selectedPaymentMethod,
      });

      const draft: OrderDraft = {
        cartId: activeCartId,
        address: mapAddressToCheckout(selectedAddress),
        shippingOption: selectedShippingOption,
        paymentMethod: selectedPaymentMethod,
        totals: computedTotals,
      };
      saveOrderDraft(result.orderId, draft);
      if (checkoutDraftKey && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(checkoutDraftKey);
      }

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        const orderId = result.orderId;
        const encodedOrderId = encodeURIComponent(orderId);
        const confirmationRoute = `/checkout/review?orderId=${encodedOrderId}` as Route;
        router.replace(confirmationRoute);
      }
    } catch (error: any) {
      // handled by mutation callbacks
      console.error('Checkout error', error);
      if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
        router.push('/login');
      }
    }
  };

  const orderSummaryId = 'checkout-order-summary';

  const handleMobileSummaryFocus = useCallback(() => {
    const target = document.getElementById(orderSummaryId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [orderSummaryId]);

  const isCartBusy = isCartLoading || (!cart && isCartFetching);
  const isCheckoutLoading = !storageChecked || isCartBusy;

  if (isCheckoutLoading) {
    return <CheckoutSkeleton />;
  }

  if (!activeCartId || !cart || cart.items.length === 0) {
    return <EmptyState {...emptyCart()} className="mx-auto max-w-lg" />;
  }

  return (
    <div className="space-y-8 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              Enter your shipping details to see available delivery options.
            </p>
          </div>
          <section className="space-y-4 rounded-lg border p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Alamat pengiriman</h2>
                <p className="text-sm text-muted-foreground">
                  Pilih alamat untuk menghitung ongkir dan menyiapkan pesanan Anda.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddressManagerOpen(true)}
                >
                  Kelola alamat
                </Button>
              </div>
            </div>
            {selectedAddress ? (
              <SelectedAddressSummary
                address={selectedAddress}
                isLoading={isShippingQuotePending}
              />
            ) : isAddressLoading ? (
              <AddressSelectorSkeleton />
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                Belum ada alamat terpilih. Tambahkan alamat baru agar bisa melanjutkan checkout.
                <div className="mt-3">
                  <Button size="sm" onClick={() => setAddressManagerOpen(true)}>
                    Tambah alamat
                  </Button>
                </div>
              </div>
            )}
            {addresses.length > 0 ? (
              <React.Fragment>
                <AddressSelectionList
                  addresses={addresses.slice(0, 2)}
                  selectedId={selectedAddressId}
                  onSelect={(address) => void handleAddressSelection(address)}
                  isBusy={isShippingQuotePending}
                />
                {addresses.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddressManagerOpen(true)}
                  >
                    Lihat semua alamat
                  </Button>
                ) : null}
              </React.Fragment>
            ) : null}
            {shippingQuoteError ? (
              <p className="text-sm text-destructive">{shippingQuoteError.message}</p>
            ) : null}
            <p aria-live="polite" className="sr-only">
              {addressAnnouncement}
            </p>
          </section>
          {selectedAddress && shippingOptions.length > 0 ? (
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
                  onClick={() => {
                    if (selectedAddress && activeCartId) {
                      void requestShippingQuote(selectedAddress);
                    }
                  }}
                  disabled={!selectedAddress || !activeCartId || isShippingQuotePending}
                >
                  {isShippingQuotePending ? 'Memperbarui...' : 'Perbarui ongkir'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isShippingQuotePending
                  ? 'Menghitung ulang ongkir...'
                  : lastQuoteLabel
                    ? `${isUsingCachedQuote ? 'Ongkir terakhir' : 'Ongkir diperbarui'} ${lastQuoteLabel}`
                    : 'Ongkir diperbarui otomatis saat alamat atau keranjang berubah.'}
              </p>
              <ShippingOptions
                options={shippingOptions}
                selectedId={selectedShippingId ?? undefined}
                onChange={(id) => setSelectedShippingId(id)}
                disabled={isProcessing}
              />
            </section>
          ) : null}

          <section className="space-y-4 rounded-lg border p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Payment Method</h2>
              <p className="text-sm text-muted-foreground">
                Select how you want to pay for your order.
              </p>
            </div>
            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onSelect={setSelectedPaymentMethod}
              disabled={isProcessing}
            />
          </section>

          {checkoutMutation.error ? (
            <p className="text-sm text-destructive">{checkoutMutation.error.message}</p>
          ) : null}
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
                onClick={handleCheckout}
                disabled={proceedRule.disabled}
                isLoading={isProcessing}
                loadingLabel="Memproses pesanan…"
                aria-describedby={proceedHintId}
                className="min-h-[44px] px-6"
                onFocus={() => {
                  if (typeof router.prefetch === 'function') {
                    void router.prefetch('/checkout/review');
                  }
                }}
                onMouseEnter={() => {
                  if (typeof router.prefetch === 'function') {
                    void router.prefetch('/checkout/review');
                  }
                }}
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
          {proceedRule.disabled && proceedRule.message ? (
            <DisabledHint id={proceedHintId} message={proceedRule.message} />
          ) : null}
        </div>
        <aside id={orderSummaryId} className="lg:sticky lg:top-24">
          <div className="space-y-6">
            <PromoField cartId={activeCartId} />
            <OrderSummary totals={computedTotals} />
          </div>
        </aside>
      </div>
      <AddressManagerDialog
        open={isAddressManagerOpen}
        onOpenChange={setAddressManagerOpen}
        ownerId={addressOwnerId}
        selectedAddressId={selectedAddressId}
        onSelect={handleAddressSelection}
      />
      <div className="lg:hidden">
        <div className="sticky bottom-0 z-40 -mx-4 flex items-center justify-between gap-4 border-t border-border/70 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total pembayaran</p>
            <p className="text-lg font-semibold">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                computedTotals.total,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleMobileSummaryFocus}
            className="prm:no-anim inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors duration-150 ease-out hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Lihat rincian
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressSelectionList({
  addresses,
  selectedId,
  onSelect,
  isBusy,
}: {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (address: SavedAddress) => Promise<void> | void;
  isBusy: boolean;
}) {
  if (!addresses.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {addresses.map((address) => {
        const isActive = selectedId === address.id;
        return (
          <button
            key={address.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isBusy && isActive}
            onClick={() => {
              void onSelect(address);
            }}
            className={cn(
              'text-left',
              'rounded-lg border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{address.fullName}</p>
              {isActive ? <span className="text-xs font-medium text-primary">Dipakai</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">{address.phone}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatAddressText(
                address.line1,
                address.line2,
                address.city,
                address.province,
                address.postalCode,
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function SelectedAddressSummary({
  address,
  isLoading,
}: {
  address: SavedAddress;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{address.fullName}</p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
        </div>
        {address.isDefault ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Alamat utama
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatAddressText(
          address.line1,
          address.line2,
          address.city,
          address.province,
          address.postalCode,
        )}
      </p>
      <DelayedLoader
        active={isLoading}
        label="Memuat opsi pengiriman…"
        className="mt-2 text-xs text-muted-foreground"
      />
    </div>
  );
}

function AddressSelectorSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 p-4">
      <BaseSkeleton className="h-5 w-1/3" />
      <BaseSkeleton className="h-4 w-2/3" />
      <BaseSkeleton className="h-3 w-full" />
      <BaseSkeleton className="h-3 w-3/4" />
    </div>
  );
}

function AddressManagerDialog({
  open,
  onOpenChange,
  ownerId,
  selectedAddressId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string | null;
  selectedAddressId: string | null;
  onSelect: (address: SavedAddress) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Kelola alamat</DialogTitle>
          <DialogDescription>
            Pilih atau buat alamat baru, lalu gunakan untuk checkout.
          </DialogDescription>
        </DialogHeader>
        <AddressBook
          userIdOrGuestId={ownerId}
          selectable
          selectedAddressId={selectedAddressId}
          onSelectAddress={async (address) => {
            await onSelect(address);
            onOpenChange(false);
          }}
          disableDeleteIds={selectedAddressId ? [selectedAddressId] : undefined}
          deleteDisabledMessage="Alamat ini sedang digunakan saat checkout."
          context="checkout"
        />
      </DialogContent>
    </Dialog>
  );
}

function mapAddressToCheckout(address: SavedAddress): CheckoutAddress {
  return {
    fullName: address.fullName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.city,
    postalCode: address.postalCode,
    detail: formatAddressText(
      address.line1,
      address.line2,
      address.city,
      address.province,
      address.postalCode,
    ),
  };
}

function formatAddressText(
  line1: string,
  line2: string | undefined,
  city: string,
  province: string,
  postalCode: string,
) {
  return [line1, line2, `${city}, ${province}`, postalCode].filter(Boolean).join(' • ');
}
