'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { AddressForm } from './_components/AddressForm';
import { OrderSummary } from './_components/OrderSummary';
import { ShippingOptions } from './_components/ShippingOptions';

import { Button } from '@/components/ui/button';
import {
  useCreateOrderDraftMutation,
  useShippingQuoteMutation,
} from '@/entities/checkout/api/hooks';
import type { Address, OrderDraft, ShippingOption } from '@/entities/checkout/api/hooks';
import { saveOrderDraft } from '@/entities/checkout/utils/draftStorage';
import { useCartQuery } from '@/lib/api/hooks';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
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
    ? 'Processing payment information'
    : 'Proceed to pay and review your order';

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
      router.push(reviewRoute);
    } catch (error) {
      console.error('Failed to create order draft', error);
    }
  };

  const isCartBusy = isCartLoading || (!cart && isCartFetching);
  const isCheckoutLoading = !storageChecked || isCartBusy || isQuoteLoading;

  if (isCheckoutLoading) {
    return <CheckoutSkeleton />;
  }

  if (!activeCartId || !cart || cart.items.length === 0) {
    return <EmptyState {...emptyCart()} className="mx-auto max-w-lg" />;
  }

  return (
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
            <p className="text-sm text-destructive">{shippingQuoteMutation.error.error.message}</p>
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
              <Button
                type="button"
                size="lg"
                aria-label={proceedLabel}
                onClick={handleCreateDraft}
                disabled={!selectedShippingOption || !address || isDraftLoading}
              >
                {isDraftLoading ? 'Processing...' : 'Proceed to Pay'}
              </Button>
            </div>
          </section>
        ) : null}
      </div>
      <aside>
        <OrderSummary totals={computedTotals} />
      </aside>
    </div>
  );
}
