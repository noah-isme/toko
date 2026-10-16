import { describe, expect, it } from 'vitest';

import {
  computeCheckoutTotals,
  findShippingOption,
  getCartSignature,
  getFallbackShippingId,
  getProceedRule,
  hasOutOfStockItem,
  parseCheckoutStepDraft,
  readCachedShippingQuote,
  resolveAddressSelection,
} from '@/app/(storefront)/checkout/_lib/checkout';
import type { ShippingOption } from '@/entities/checkout/api/hooks';

const options = [
  { id: 'jne-reg', cost: 10_000 },
  { id: 'jne-yes', cost: 20_000 },
] as unknown as ShippingOption[];

describe('getCartSignature', () => {
  it('is order independent and empty for no items', () => {
    expect(getCartSignature(undefined)).toBe('');
    expect(getCartSignature([])).toBe('');
    expect(
      getCartSignature([
        { productId: 'b', quantity: 2 },
        { productId: 'a', quantity: 1 },
      ]),
    ).toBe('a:1|b:2');
  });
});

describe('hasOutOfStockItem', () => {
  it('flags quantities above max quantity or available stock', () => {
    expect(hasOutOfStockItem(undefined)).toBe(false);
    expect(hasOutOfStockItem([{ productId: 'a', quantity: 2, maxQuantity: 2 }])).toBe(false);
    expect(hasOutOfStockItem([{ productId: 'a', quantity: 3, maxQuantity: 2 }])).toBe(true);
    expect(hasOutOfStockItem([{ productId: 'a', quantity: 3, availableStock: 1 }])).toBe(true);
  });
});

describe('readCachedShippingQuote', () => {
  it('returns null for missing, invalid, stale or empty payloads', () => {
    expect(readCachedShippingQuote(null, 'sig')).toBeNull();
    expect(readCachedShippingQuote('{not json', 'sig')).toBeNull();
    expect(
      readCachedShippingQuote(JSON.stringify({ cartSignature: 'old', options }), 'sig'),
    ).toBeNull();
    expect(readCachedShippingQuote(JSON.stringify({ options: [] }), 'sig')).toBeNull();
  });

  it('returns cached options for a matching signature', () => {
    expect(
      readCachedShippingQuote(
        JSON.stringify({ cartSignature: 'sig', updatedAt: 42, options }),
        'sig',
      ),
    ).toEqual({ options, updatedAt: 42 });
    expect(readCachedShippingQuote(JSON.stringify({ options }), 'sig')).toEqual({
      options,
      updatedAt: null,
    });
  });
});

describe('parseCheckoutStepDraft', () => {
  it('parses JSON and ignores invalid payloads', () => {
    expect(parseCheckoutStepDraft('{"addressId":"a1"}')).toEqual({ addressId: 'a1' });
    expect(parseCheckoutStepDraft('nope')).toBeNull();
  });
});

describe('computeCheckoutTotals', () => {
  it('derives totals from the cart subtotal and shipping cost', () => {
    expect(computeCheckoutTotals({ cartSubtotal: 100_000, shippingCost: 10_000 })).toEqual({
      subtotal: 100_000,
      discount: 0,
      tax: 11_000,
      shipping: 10_000,
      total: 121_000,
    });
  });

  it('prefers promo totals when present', () => {
    expect(
      computeCheckoutTotals({
        promoTotals: { subtotal: 100_000, discount: 10_000, total: 99_000 },
        cartSubtotal: 1,
        shippingCost: 0,
      }),
    ).toEqual({ subtotal: 100_000, discount: 10_000, tax: 9_900, shipping: 0, total: 99_000 });
  });
});

describe('shipping option helpers', () => {
  it('finds the selected option', () => {
    expect(findShippingOption([], 'jne-reg')).toBeNull();
    expect(findShippingOption(options, 'jne-yes')).toBe(options[1]);
    expect(findShippingOption(options, 'missing')).toBeNull();
  });

  it('falls back to the first option only when the selection is not available', () => {
    expect(getFallbackShippingId([], null)).toBeUndefined();
    expect(getFallbackShippingId(options, 'jne-yes')).toBeUndefined();
    expect(getFallbackShippingId(options, null)).toBe('jne-reg');
  });
});

describe('resolveAddressSelection', () => {
  const addresses = [
    { id: 'a1', isDefault: false },
    { id: 'a2', isDefault: true },
  ];

  it('waits while loading and clears when the list is empty', () => {
    expect(resolveAddressSelection([], null, true)).toEqual({ type: 'wait' });
    expect(resolveAddressSelection([], 'a1', false)).toEqual({ type: 'clear' });
  });

  it('keeps an existing selection, otherwise selects the default address', () => {
    expect(resolveAddressSelection(addresses, 'a1', false)).toEqual({
      type: 'keep',
      address: addresses[0],
    });
    expect(resolveAddressSelection(addresses, 'gone', false)).toEqual({
      type: 'select',
      address: addresses[1],
    });
    expect(resolveAddressSelection([addresses[0]], null, false)).toEqual({
      type: 'select',
      address: addresses[0],
    });
  });
});

describe('getProceedRule', () => {
  it('requires a payment method once the base rule passes', () => {
    const rule = getProceedRule({
      hasAddress: true,
      hasShippingOption: true,
      hasPaymentMethod: false,
      isProcessing: false,
    });
    expect(rule.disabled).toBe(true);
    expect(rule.message).toBe('Pilih metode pembayaran terlebih dahulu');
  });

  it('is enabled when everything is selected', () => {
    expect(
      getProceedRule({
        hasAddress: true,
        hasShippingOption: true,
        hasPaymentMethod: true,
        isProcessing: false,
      }).disabled,
    ).toBe(false);
  });
});
