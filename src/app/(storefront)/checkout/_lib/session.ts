import {
  type CheckoutStepDraft,
  parseCheckoutStepDraft,
  readCachedShippingQuote,
} from './checkout';

import type { ShippingOption } from '@/entities/checkout/api/hooks';
import type { PaymentMethod } from '@/lib/api/types';

// Client-only sessionStorage helpers for the checkout page. Every helper is a no-op (or returns
// `null`) during SSR.

export function getQuoteStorageKey(cartId: string, addressId: string) {
  return `checkout:shipping-quote:${cartId}:${addressId}`;
}

export function getCheckoutStepDraftKey(cartId: string) {
  return `checkout:step:${cartId}`;
}

export function loadCachedShippingQuote(storageKey: string | null, cartSignature: string) {
  const raw =
    storageKey && typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) : null;
  return readCachedShippingQuote(raw, cartSignature);
}

export function saveCachedShippingQuote(
  storageKey: string,
  payload: { cartSignature: string; updatedAt: number; options: ShippingOption[] },
) {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
}

/** Returns the stored step draft, or `null` when missing or invalid. */
export function loadCheckoutStepDraft(storageKey: string | null): CheckoutStepDraft | null {
  if (!storageKey || typeof window === 'undefined') {
    return null;
  }
  const raw = window.sessionStorage.getItem(storageKey);
  return raw ? parseCheckoutStepDraft(raw) : null;
}

/** Stores the step draft, or removes it when no field is set. */
export function persistCheckoutStepDraft(
  storageKey: string,
  values: { addressId?: string; shippingId?: string; paymentMethod?: PaymentMethod },
) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = { ...values, updatedAt: Date.now() };
  const hasAnyValue = Boolean(payload.addressId || payload.shippingId || payload.paymentMethod);

  if (hasAnyValue) {
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } else {
    window.sessionStorage.removeItem(storageKey);
  }
}

export function clearCheckoutStepDraft(storageKey: string | null) {
  if (storageKey && typeof window !== 'undefined') {
    window.sessionStorage.removeItem(storageKey);
  }
}
