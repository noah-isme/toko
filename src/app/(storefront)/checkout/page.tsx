'use client';
/* eslint-disable react-hooks/set-state-in-effect -- B3 is a behaviour-preserving split; these effects
   sync client-only storage and query data into state exactly as before the refactor. */

import { useRouter } from 'next/navigation';
import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { AddressManagerDialog } from './_components/AddressManagerDialog';
import { ShippingAddressSection } from './_components/AddressSelection';
import {
  CheckoutHeader,
  CheckoutProceedActions,
  OrderNotesSection,
  PaymentMethodSection,
  ShippingOptionsSection,
} from './_components/CheckoutSections';
import { MobileTotalBar } from './_components/MobileTotalBar';
import {
  OrderSummarySkeleton,
  PaymentMethodSelectorSkeleton,
  ShippingOptionsSkeleton,
} from './_components/Skeletons';
import { mapAddressToCheckout, trackCheckoutAddressSelect } from './_lib/address';
import {
  computeCheckoutTotals,
  formatQuoteTime,
  findShippingOption,
  getCartSignature,
  getFallbackShippingId,
  getProceedRule,
  hasOutOfStockItem as cartHasOutOfStockItem,
  resolveAddressSelection,
} from './_lib/checkout';
import {
  getCheckoutStepDraftKey,
  getQuoteStorageKey,
  loadCachedShippingQuote,
  loadCheckoutStepDraft,
  persistCheckoutStepDraft,
  saveCachedShippingQuote,
} from './_lib/session';
import { submitCheckout } from './_lib/submit';

import { useAuth } from '@/components/providers/AuthProvider';
import { useAddressListQuery } from '@/entities/address/hooks';
import { getGuestAddressOwnerId } from '@/entities/address/storage';
import type { Address as SavedAddress } from '@/entities/address/types';
import type { CartWithPromo } from '@/entities/cart/cache';
import { useCheckoutMutation, useShippingQuoteMutation } from '@/entities/checkout/api/hooks';
import type { ShippingOption } from '@/entities/checkout/api/hooks';
import { PromoField } from '@/entities/promo/ui/PromoField';
import { useCartQuery } from '@/lib/api/hooks';
import type { PaymentMethod } from '@/lib/api/types';
import { emptyCart } from '@/shared/ui/empty-presets';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CheckoutSkeleton } from '@/shared/ui/skeletons/CheckoutSkeleton';
import { useCartStore } from '@/stores/cart-store';

const ShippingOptions = lazy(() =>
  import('./_components/ShippingOptions').then((mod) => ({ default: mod.ShippingOptions })),
);
const PaymentMethodSelector = lazy(() =>
  import('./_components/PaymentMethodSelector').then((mod) => ({
    default: mod.PaymentMethodSelector,
  })),
);
const OrderSummary = lazy(() =>
  import('./_components/OrderSummary').then((mod) => ({ default: mod.OrderSummary })),
);

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
  const [orderNotes, setOrderNotes] = useState<string>('');
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
  const cartSignature = useMemo(() => getCartSignature(cart?.items), [cart?.items]);
  const hasOutOfStockItem = useMemo(() => cartHasOutOfStockItem(cart?.items), [cart?.items]);
  const quoteStorageKey = useMemo(
    () =>
      activeCartId && selectedAddress ? getQuoteStorageKey(activeCartId, selectedAddress.id) : null,
    [activeCartId, selectedAddress],
  );
  const checkoutDraftKey = useMemo(
    () => (activeCartId ? getCheckoutStepDraftKey(activeCartId) : null),
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
    const cached = loadCachedShippingQuote(quoteStorageKey, cartSignature);
    if (!cached) {
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
      return;
    }
    setShippingOptions(cached.options);
    setLastQuoteUpdatedAt(cached.updatedAt);
    setIsUsingCachedQuote(true);
  }, [cartSignature, quoteStorageKey]);

  useEffect(() => {
    // Missing or invalid draft payloads are ignored.
    const draft = loadCheckoutStepDraft(checkoutDraftKey);
    if (draft) {
      if (!selectedAddressId && draft.addressId) {
        setSelectedAddressId(draft.addressId);
      }
      if (!selectedShippingId && draft.shippingId) {
        setSelectedShippingId(draft.shippingId);
      }
      if (!selectedPaymentMethod && draft.paymentMethod) {
        setSelectedPaymentMethod(draft.paymentMethod);
      }
    }
    setDraftLoaded(true);
  }, [checkoutDraftKey, selectedAddressId, selectedPaymentMethod, selectedShippingId]);

  useEffect(() => {
    if (!checkoutDraftKey || !draftLoaded) {
      return;
    }
    persistCheckoutStepDraft(checkoutDraftKey, {
      addressId: selectedAddressId ?? undefined,
      shippingId: selectedShippingId ?? undefined,
      paymentMethod: selectedPaymentMethod ?? undefined,
    });
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
        saveCachedShippingQuote(getQuoteStorageKey(activeCartId, address.id), {
          cartSignature,
          updatedAt,
          options: result,
        });
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
        setAddressAnnouncement(`Alamat ${address.receiverName} dipilih`);
      }
      trackCheckoutAddressSelect(address);
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
    const decision = resolveAddressSelection(addresses, selectedAddressId, isAddressLoading);
    if (decision.type === 'clear') {
      setSelectedAddress(null);
      setSelectedAddressId(null);
      setShippingOptions([]);
      setIsUsingCachedQuote(false);
    } else if (decision.type === 'keep') {
      setSelectedAddress(decision.address);
    } else if (decision.type === 'select') {
      void handleAddressSelection(decision.address, { announce: false });
    }
  }, [addresses, handleAddressSelection, isAddressLoading, selectedAddressId]);

  useEffect(() => {
    const nextShippingId = getFallbackShippingId(shippingOptions, selectedShippingId);
    if (nextShippingId !== undefined) {
      setSelectedShippingId(nextShippingId);
    }
  }, [selectedShippingId, shippingOptions]);

  const selectedShippingOption = useMemo<ShippingOption | null>(
    () => findShippingOption(shippingOptions, selectedShippingId),
    [selectedShippingId, shippingOptions],
  );

  const promoAwareCart = cart as CartWithPromo | undefined;
  const promoTotals = promoAwareCart?.totals;
  const computedTotals = useMemo(
    () =>
      computeCheckoutTotals({
        promoTotals,
        cartSubtotal: cart?.subtotal?.amount,
        shippingCost: selectedShippingOption?.cost,
      }),
    [cart?.subtotal?.amount, promoTotals, selectedShippingOption],
  );

  const lastQuoteLabel = useMemo(
    () => (lastQuoteUpdatedAt ? formatQuoteTime(lastQuoteUpdatedAt) : null),
    [lastQuoteUpdatedAt],
  );

  const isProcessing = checkoutMutation.isPending;
  const proceedLabel = isProcessing ? 'Memproses pesanan…' : 'Bayar Sekarang';
  const proceedRule = getProceedRule({
    hasAddress: Boolean(selectedAddress),
    hasShippingOption: Boolean(selectedShippingOption),
    hasPaymentMethod: Boolean(selectedPaymentMethod),
    isProcessing,
  });
  const proceedHintDomId = useId();
  const proceedHintId = proceedRule.disabled ? proceedHintDomId : undefined;

  const handleCheckout = async () => {
    if (!activeCartId || !selectedAddress || !selectedShippingOption || !selectedPaymentMethod) {
      return;
    }

    await submitCheckout({
      mutateAsync: checkoutMutation.mutateAsync,
      router,
      cartId: activeCartId,
      address: selectedAddress,
      shippingOption: selectedShippingOption,
      paymentMethod: selectedPaymentMethod,
      notes: orderNotes,
      totals: computedTotals,
      checkoutDraftKey,
    });
  };

  const orderSummaryId = 'checkout-order-summary';

  const prefetchReview = () => {
    if (typeof router.prefetch === 'function') {
      void router.prefetch('/checkout/review');
    }
  };

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
          <CheckoutHeader />
          <ShippingAddressSection
            addresses={addresses}
            selectedAddress={selectedAddress}
            selectedAddressId={selectedAddressId}
            isAddressLoading={isAddressLoading}
            isQuotePending={isShippingQuotePending}
            quoteErrorMessage={shippingQuoteError?.message}
            announcement={addressAnnouncement}
            onManage={() => setAddressManagerOpen(true)}
            onSelect={(address) => void handleAddressSelection(address)}
          />
          {selectedAddress && shippingOptions.length > 0 ? (
            <ShippingOptionsSection
              isPending={isShippingQuotePending}
              lastQuoteLabel={lastQuoteLabel}
              isUsingCachedQuote={isUsingCachedQuote}
              refreshDisabled={!selectedAddress || !activeCartId || isShippingQuotePending}
              onRefresh={() => {
                if (selectedAddress && activeCartId) {
                  void requestShippingQuote(selectedAddress);
                }
              }}
            >
              <Suspense fallback={<ShippingOptionsSkeleton />}>
                <ShippingOptions
                  options={shippingOptions}
                  selectedId={selectedShippingId ?? undefined}
                  onChange={(id) => setSelectedShippingId(id)}
                  disabled={isProcessing}
                />
              </Suspense>
            </ShippingOptionsSection>
          ) : null}

          <PaymentMethodSection>
            <Suspense fallback={<PaymentMethodSelectorSkeleton />}>
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelect={setSelectedPaymentMethod}
                disabled={isProcessing}
              />
            </Suspense>
          </PaymentMethodSection>

          <OrderNotesSection value={orderNotes} onChange={setOrderNotes} disabled={isProcessing} />

          <CheckoutProceedActions
            errorMessage={checkoutMutation.error?.message}
            hasOutOfStockItem={hasOutOfStockItem}
            proceedLabel={proceedLabel}
            isProcessing={isProcessing}
            disabled={proceedRule.disabled}
            hintId={proceedHintId}
            hintMessage={proceedRule.message}
            onCheckout={handleCheckout}
            onPrefetch={prefetchReview}
          />
        </div>
        <aside id={orderSummaryId} className="lg:sticky lg:top-24">
          <div className="space-y-6">
            <PromoField cartId={activeCartId} />
            <Suspense fallback={<OrderSummarySkeleton />}>
              <OrderSummary totals={computedTotals} />
            </Suspense>
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
      <MobileTotalBar total={computedTotals.total} onShowDetails={handleMobileSummaryFocus} />
    </div>
  );
}
