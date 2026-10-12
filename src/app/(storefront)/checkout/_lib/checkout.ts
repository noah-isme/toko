import type { CartTotalsPreview } from '@/entities/cart/cache';
import type { ShippingOption } from '@/entities/checkout/api/hooks';
import type { PaymentMethod } from '@/lib/api/types';
import {
  type DisabledReasonCode,
  type DisabledRuleResult,
  getCheckoutProceedRule,
  normalizeDisabledMessage,
} from '@/shared/lib/disabledRules';

type CartLineLike = {
  productId: string;
  quantity: number;
  maxQuantity?: number;
  availableStock?: number;
};

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
};

export type CheckoutStepDraft = {
  addressId?: string;
  shippingId?: string;
  paymentMethod?: PaymentMethod;
};

/** Stable, order-independent signature of cart lines (`productId:quantity` joined by `|`). */
export function getCartSignature(items: ReadonlyArray<CartLineLike> | undefined): string {
  if (!items?.length) {
    return '';
  }

  return [...items]
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join('|');
}

export function hasOutOfStockItem(items: ReadonlyArray<CartLineLike> | undefined): boolean {
  return Boolean(
    items?.some(
      (item) =>
        (item.maxQuantity !== undefined && item.quantity > item.maxQuantity) ||
        (item.availableStock !== undefined && item.quantity > item.availableStock),
    ),
  );
}

/**
 * Parses a cached shipping quote from sessionStorage. Returns `null` when the payload is missing,
 * invalid, stale for the given cart signature, or has no options.
 */
export function readCachedShippingQuote(
  raw: string | null,
  cartSignature: string,
): { options: ShippingOption[]; updatedAt: number | null } | null {
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw) as {
      cartSignature?: string;
      updatedAt?: number;
      options?: ShippingOption[];
    };
    if (cached.cartSignature && cached.cartSignature !== cartSignature) {
      return null;
    }
    if (Array.isArray(cached.options) && cached.options.length > 0) {
      return { options: cached.options, updatedAt: cached.updatedAt ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

/** Parses the persisted checkout step draft; returns `null` for invalid JSON. */
export function parseCheckoutStepDraft(raw: string): CheckoutStepDraft | null {
  try {
    return JSON.parse(raw) as CheckoutStepDraft;
  } catch {
    return null;
  }
}

export function computeCheckoutTotals({
  promoTotals,
  cartSubtotal,
  shippingCost,
}: {
  promoTotals?: CartTotalsPreview;
  cartSubtotal?: number;
  shippingCost?: number;
}): CheckoutTotals {
  const subtotal = promoTotals?.subtotal ?? cartSubtotal ?? 0;
  const discount = promoTotals?.discount ?? 0;
  const shipping = promoTotals?.shipping ?? shippingCost ?? 0;
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
}

export function formatQuoteTime(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/** Proceed rule for "Bayar Sekarang": base checkout rule, then a payment-method requirement. */
export function getProceedRule({
  hasAddress,
  hasShippingOption,
  hasPaymentMethod,
  isProcessing,
}: {
  hasAddress: boolean;
  hasShippingOption: boolean;
  hasPaymentMethod: boolean;
  isProcessing: boolean;
}): DisabledRuleResult {
  const baseProceedRule = getCheckoutProceedRule({ hasAddress, hasShippingOption, isProcessing });
  return normalizeDisabledMessage(
    baseProceedRule.disabled
      ? baseProceedRule
      : !hasPaymentMethod
        ? {
            disabled: true,
            reasonCode: 'missing-payment-method',
            message: 'Pilih metode pembayaran terlebih dahulu',
          }
        : baseProceedRule,
  );
}

/** Keys under `checkout.rules.proceed`, by disabled-rule reason. */
export type ProceedRuleMessageKey =
  | 'processing'
  | 'missingAddress'
  | 'missingShippingOption'
  | 'missingPaymentMethod'
  | 'fallback';

/** Keys under `checkout.rules.payNow`, by disabled-rule reason. */
export type PayNowRuleMessageKey =
  | 'processing'
  | 'missingOrderId'
  | 'missingOrderDraft'
  | 'fallback';

const PROCEED_RULE_MESSAGE_KEYS: Partial<Record<DisabledReasonCode, ProceedRuleMessageKey>> = {
  processing: 'processing',
  'missing-address': 'missingAddress',
  'missing-shipping-option': 'missingShippingOption',
  'missing-payment-method': 'missingPaymentMethod',
};

const PAY_NOW_RULE_MESSAGE_KEYS: Partial<Record<DisabledReasonCode, PayNowRuleMessageKey>> = {
  processing: 'processing',
  'missing-order-id': 'missingOrderId',
  'missing-order-draft': 'missingOrderDraft',
};

/**
 * Catalog key that explains why "Bayar Sekarang" on the checkout page is disabled. The rule's own
 * `message` stays the Indonesian default; the UI renders the translated key instead.
 */
export function getProceedRuleMessageKey(reasonCode: DisabledReasonCode): ProceedRuleMessageKey {
  return PROCEED_RULE_MESSAGE_KEYS[reasonCode] ?? 'fallback';
}

/** Catalog key that explains why "Bayar Sekarang" on the review page is disabled. */
export function getPayNowRuleMessageKey(reasonCode: DisabledReasonCode): PayNowRuleMessageKey {
  return PAY_NOW_RULE_MESSAGE_KEYS[reasonCode] ?? 'fallback';
}

export function findShippingOption(
  options: ShippingOption[],
  selectedId: string | null,
): ShippingOption | null {
  if (!options.length) {
    return null;
  }
  return options.find((option) => option.id === selectedId) ?? null;
}

/**
 * Returns the shipping id to switch to when the current selection is not among `options`
 * (the first option), or `undefined` when no change is needed.
 */
export function getFallbackShippingId(
  options: ShippingOption[],
  selectedId: string | null,
): string | null | undefined {
  if (!options.length || options.some((option) => option.id === selectedId)) {
    return undefined;
  }
  return options[0]?.id ?? null;
}

export type AddressSelectionDecision<A> =
  | { type: 'wait' }
  | { type: 'clear' }
  | { type: 'keep'; address: A }
  | { type: 'select'; address: A };

/**
 * Decides how the checkout address selection reacts to the saved-address list: wait while loading,
 * clear when empty, keep a still-present selection, or fall back to the default (or first) address.
 */
export function resolveAddressSelection<A extends { id: string; isDefault?: boolean }>(
  addresses: A[],
  selectedId: string | null,
  isLoading: boolean,
): AddressSelectionDecision<A> {
  if (!addresses.length) {
    return isLoading ? { type: 'wait' } : { type: 'clear' };
  }

  if (selectedId) {
    const existing = addresses.find((item) => item.id === selectedId);
    if (existing) {
      return { type: 'keep', address: existing };
    }
  }

  const fallback = addresses.find((item) => item.isDefault) ?? addresses[0];
  return fallback ? { type: 'select', address: fallback } : { type: 'wait' };
}
