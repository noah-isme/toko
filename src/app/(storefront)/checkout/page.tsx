'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { OrderSummary } from './_components/OrderSummary';
import { PaymentMethodSelector } from './_components/PaymentMethodSelector';
import { ShippingOptions } from './_components/ShippingOptions';

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
import {
  useCreateOrderDraftMutation,
  useShippingQuoteMutation,
} from '@/entities/checkout/api/hooks';
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

export default function CheckoutPage() {
  const router = useRouter();
  const { data: cart, isLoading: isCartLoading, isFetching: isCartFetching } = useCartQuery();
  const shippingQuoteMutation = useShippingQuoteMutation();
  const createOrderDraftMutation = useCreateOrderDraftMutation();

  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [storedCartId, setStoredCartId] = useState<string | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [addressOwnerId, setAddressOwnerId] = useState<string | null>(null);
  const {
    data: addresses = [],
    isLoading: isAddressLoading,
    isFetching: isAddressFetching,
  } = useAddressListQuery(addressOwnerId);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [addressAnnouncement, setAddressAnnouncement] = useState('');
  const [isAddressManagerOpen, setAddressManagerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const existingCartId = window.localStorage.getItem('cartId');
    if (existingCartId) {
      setStoredCartId(existingCartId);
    }
    setStorageChecked(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (cart?.id) {
      window.localStorage.setItem('cartId', cart.id);
      setStoredCartId(cart.id);
    }
  }, [cart?.id]);

  const activeCartId = cart?.id ?? storedCartId ?? null;

  useEffect(() => {
    if (addressOwnerId || typeof window === 'undefined') {
      return;
    }
    setAddressOwnerId(getGuestAddressOwnerId());
  }, [addressOwnerId]);

  const handleAddressSelection = useCallback(
    async (address: SavedAddress, options: { announce?: boolean } = {}) => {
      setSelectedAddressId(address.id);
      setSelectedAddress(address);
      setOrderDraft(null);
      setSelectedShippingId(null);
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
      try {
        const result = await shippingQuoteMutation.mutateAsync({
          cartId: activeCartId,
          address: mapAddressToCheckout(address),
        });
        setSelectedShippingId(result[0]?.id ?? null);
      } catch (error) {
        console.error('Failed to refresh shipping quote', error);
      }
    },
    [activeCartId, shippingQuoteMutation],
  );

  useEffect(() => {
    if (!addresses.length) {
      setSelectedAddress(null);
      setSelectedAddressId(null);
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
  }, [addresses, handleAddressSelection, selectedAddressId]);

  useEffect(() => {
    const options = shippingQuoteMutation.data ?? [];
    if (!options.length) {
      return;
    }
    if (!options.some((option) => option.id === selectedShippingId)) {
      setSelectedShippingId(options[0]?.id ?? null);
    }
  }, [shippingQuoteMutation.data, selectedShippingId]);

  const selectedShippingOption = useMemo<ShippingOption | null>(() => {
    if (!shippingQuoteMutation.data) {
      return null;
    }
    return shippingQuoteMutation.data.find((option) => option.id === selectedShippingId) ?? null;
  }, [shippingQuoteMutation.data, selectedShippingId]);

  const promoAwareCart = cart as CartWithPromo | undefined;
  const promoTotals = promoAwareCart?.totals;
  const computedTotals = useMemo(() => {
    const subtotal =
      orderDraft?.totals.subtotal ?? promoTotals?.subtotal ?? cart?.subtotal?.amount ?? 0;
    const discount = orderDraft?.totals.discount ?? promoTotals?.discount ?? 0;
    const shipping =
      orderDraft?.totals.shipping ?? promoTotals?.shipping ?? selectedShippingOption?.cost ?? 0;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = orderDraft?.totals.tax ?? promoTotals?.tax ?? Math.round(taxBase * 0.11);
    const total =
      orderDraft?.totals.total ?? promoTotals?.total ?? subtotal - discount + tax + shipping;

    return {
      subtotal,
      discount,
      tax,
      shipping,
      total,
    };
  }, [cart?.subtotal?.amount, orderDraft, promoTotals, selectedShippingOption]);

  const isDraftLoading = createOrderDraftMutation.isPending;
  const proceedLabel = isDraftLoading
    ? 'Membuat draft pesanan…'
    : 'Proceed to pay and review your order';
  const proceedRule = normalizeDisabledMessage(
    getCheckoutProceedRule({
      hasAddress: Boolean(selectedAddress),
      hasShippingOption: Boolean(selectedShippingOption),
      isProcessing: isDraftLoading,
    }) ||
      (!selectedPaymentMethod
        ? { disabled: true, message: 'Pilih metode pembayaran terlebih dahulu' }
        : null),
  );
  const proceedHintDomId = useId();
  const proceedHintId = proceedRule.disabled ? proceedHintDomId : undefined;

  const handleCreateDraft = async () => {
    if (!activeCartId || !selectedAddress || !selectedShippingOption || !selectedPaymentMethod) {
      return;
    }

    try {
      const draft = await createOrderDraftMutation.mutateAsync({
        cartId: activeCartId,
        address: mapAddressToCheckout(selectedAddress),
        shippingOptionId: selectedShippingOption.id,
        paymentMethod: selectedPaymentMethod,
      });
      setOrderDraft(draft);
      const orderId = draft.cartId;
      saveOrderDraft(orderId, draft);
      const encodedOrderId = encodeURIComponent(orderId);
      const reviewRoute = `/checkout/review?orderId=${encodedOrderId}` as Route;
      router.replace(reviewRoute);
    } catch (error) {
      // handled by mutation callbacks
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
                isLoading={shippingQuoteMutation.isPending}
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
                  isBusy={shippingQuoteMutation.isPending}
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
            {shippingQuoteMutation.error ? (
              <p className="text-sm text-destructive">
                {shippingQuoteMutation.error.error.message}
              </p>
            ) : null}
            <p aria-live="polite" className="sr-only">
              {addressAnnouncement}
            </p>
          </section>
          {shippingQuoteMutation.data ? (
            <>
              <section className="space-y-4 rounded-lg border p-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Shipping Options</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose the delivery service that suits you best.
                  </p>
                </div>
                <ShippingOptions
                  options={shippingQuoteMutation.data}
                  selectedId={selectedShippingId ?? undefined}
                  onChange={(id) => setSelectedShippingId(id)}
                  disabled={isDraftLoading}
                />
              </section>

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
                  disabled={isDraftLoading}
                />
              </section>

              {createOrderDraftMutation.error ? (
                <p className="text-sm text-destructive">
                  {createOrderDraftMutation.error.error.message}
                </p>
              ) : null}
              <div className="flex justify-end">
                <GuardedButton
                  type="button"
                  size="lg"
                  aria-label={proceedLabel}
                  onClick={handleCreateDraft}
                  disabled={proceedRule.disabled}
                  isLoading={isDraftLoading}
                  loadingLabel="Membuat draft pesanan…"
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
                  Proceed to Pay
                </GuardedButton>
              </div>
              <div className="flex justify-end">
                <DelayedLoader
                  active={isDraftLoading}
                  label="Menyiapkan ringkasan pesanan…"
                  className="text-xs text-muted-foreground"
                />
              </div>
              {proceedRule.disabled && proceedRule.message ? (
                <DisabledHint id={proceedHintId} message={proceedRule.message} />
              ) : null}
            </>
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
