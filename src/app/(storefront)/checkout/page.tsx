'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { AddressForm } from './_components/AddressForm';
import { OrderSummary } from './_components/OrderSummary';
import { ShippingOptions } from './_components/ShippingOptions';

import {
  useCreateOrderDraftMutation,
  useShippingQuoteMutation,
} from '@/entities/checkout/api/hooks';
import type { Address, OrderDraft, ShippingOption } from '@/entities/checkout/api/hooks';
import { saveOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { useCartQuery } from '@/lib/api/hooks';
import { getCheckoutProceedRule, normalizeDisabledMessage } from '@/shared/lib/disabledRules';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { DisabledHint } from '@/shared/ui/DisabledHint';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { CheckoutSkeleton } from '@/shared/ui/skeletons/CheckoutSkeleton';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: cart, isLoading: isCartLoading, isFetching: isCartFetching } = useCartQuery();
  const shippingQuoteMutation = useShippingQuoteMutation();
  const createOrderDraftMutation = useCreateOrderDraftMutation();

  const [address, setAddress] = useState<Address | null>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [storedCartId, setStoredCartId] = useState<string | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);

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

  const computedTotals = useMemo(() => {
    const subtotal = cart?.subtotal?.amount ?? orderDraft?.totals.subtotal ?? 0;
    const discount = orderDraft?.totals.discount ?? 0;
    const shipping = selectedShippingOption?.cost ?? orderDraft?.totals.shipping ?? 0;
    const tax = orderDraft?.totals.tax ?? Math.round((subtotal - discount) * 0.11);
    const total = orderDraft?.totals.total ?? subtotal - discount + tax + shipping;

    return {
      subtotal,
      discount,
      tax,
      shipping,
      total,
    };
  }, [cart?.subtotal?.amount, orderDraft, selectedShippingOption]);

  const isQuoteLoading = shippingQuoteMutation.isPending && !shippingQuoteMutation.data;
  const isDraftLoading = createOrderDraftMutation.isPending;
  const proceedLabel = isDraftLoading
    ? 'Membuat draft pesanan…'
    : 'Proceed to pay and review your order';
  const proceedRule = normalizeDisabledMessage(
    getCheckoutProceedRule({
      hasAddress: Boolean(address),
      hasShippingOption: Boolean(selectedShippingOption),
      isProcessing: isDraftLoading,
    }),
  );
  const proceedHintDomId = useId();
  const proceedHintId = proceedRule.disabled ? proceedHintDomId : undefined;

  const handleAddressSubmit = async (values: Address) => {
    if (!activeCartId) {
      return;
    }

    try {
      const result = await shippingQuoteMutation.mutateAsync({
        cartId: activeCartId,
        address: values,
      });
      setAddress(values);
      setOrderDraft(null);
      setSelectedShippingId(result[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to fetch shipping options', error);
    }
  };

  const handleCreateDraft = async () => {
    if (!activeCartId || !address || !selectedShippingOption) {
      return;
    }

    try {
      const draft = await createOrderDraftMutation.mutateAsync({
        cartId: activeCartId,
        address,
        shippingOptionId: selectedShippingOption.id,
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
  const isCheckoutLoading = !storageChecked || isCartBusy || isQuoteLoading;

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
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Shipping Address</h2>
              <p className="text-sm text-muted-foreground">
                We will use this address to calculate shipping costs.
              </p>
            </div>
            <AddressForm
              defaultValues={address ?? orderDraft?.address ?? undefined}
              onSubmit={handleAddressSubmit}
              isSubmitting={isQuoteLoading}
            />
            {shippingQuoteMutation.error ? (
              <p className="text-sm text-destructive">
                {shippingQuoteMutation.error.error.message}
              </p>
            ) : null}
          </section>
          {shippingQuoteMutation.data ? (
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
            </section>
          ) : null}
        </div>
        <aside id={orderSummaryId} className="hidden lg:sticky lg:top-24 lg:block">
          <OrderSummary totals={computedTotals} />
        </aside>
      </div>
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
