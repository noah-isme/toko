import { describe, expect, it } from 'vitest';

import { getCartQueryKey, type CartWithPromo } from '@/entities/cart/cache';
import { mapApiCartToCart } from '@/lib/api/mappers/cart';
import type { Cart as ApiCart } from '@/lib/api/types';

// Minimal helper — the mapper only reads id/currency/items/pricing/voucher.
function makeApiCart(overrides: Partial<ApiCart> = {}): ApiCart {
  return {
    id: 'cart-1',
    anonId: null,
    voucher: null,
    currency: 'IDR',
    pricing: {
      subtotal: 200000,
      discount: 0,
      tax: 22000,
      shipping: 0,
      total: 222000,
    },
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        title: 'Contoh Produk',
        slug: 'contoh-produk',
        qty: 2,
        unitPrice: 100000,
        subtotal: 200000,
        imageUrl: undefined,
      },
    ],
    ...overrides,
  } as ApiCart;
}

describe('mapApiCartToCart', () => {
  it('maps id, currency, subtotal and itemCount from the API payload', () => {
    const cart = mapApiCartToCart(makeApiCart());

    expect(cart.id).toBe('cart-1');
    expect(cart.subtotal).toEqual({ amount: 200000, currency: 'IDR' });
    expect(cart.itemCount).toBe(2);
    expect(cart.items).toHaveLength(1);
  });

  it('surfaces the server-computed tax on totals (source of truth, not a hardcoded rate)', () => {
    // A deliberately non-11% tax proves checkout consumes the API value rather than
    // recomputing subtotal * 0.11 locally.
    const cart = mapApiCartToCart(
      makeApiCart({
        pricing: { subtotal: 200000, discount: 0, tax: 25000, shipping: 0, total: 225000 },
      }),
    ) as CartWithPromo;

    expect(cart.totals?.tax).toBe(25000);
    expect(cart.totals?.subtotal).toBe(200000);
    expect(cart.totals?.discount).toBe(0);
  });

  it('does NOT surface cart-level shipping or total (checkout adds courier cost itself)', () => {
    // The cart endpoint always returns shipping=0 and a total that excludes shipping
    // (toko-api internal/cart/handlers.go calls pricing.Compute with shipping=0).
    // Forwarding them would let `?? selectedShippingOption.cost` be short-circuited by 0.
    const cart = mapApiCartToCart(
      makeApiCart({
        pricing: { subtotal: 200000, discount: 0, tax: 22000, shipping: 0, total: 222000 },
      }),
    ) as CartWithPromo;

    expect(cart.totals).toBeDefined();
    expect(cart.totals).not.toHaveProperty('shipping');
    expect(cart.totals).not.toHaveProperty('total');
  });

  it('builds promoInfo only when a voucher code or discount is present', () => {
    const withVoucher = mapApiCartToCart(
      makeApiCart({
        voucher: 'SAVE10',
        pricing: { subtotal: 200000, discount: 20000, tax: 19800, shipping: 0, total: 199800 },
      }),
    ) as CartWithPromo;

    expect(withVoucher.promoInfo).toMatchObject({ code: 'SAVE10', discountValue: 20000 });
    expect(withVoucher.totals?.discount).toBe(20000);
    expect(withVoucher.totals?.subtotal).toBe(180000);
  });

  it('omits promoInfo when there is no voucher and no discount', () => {
    const cart = mapApiCartToCart(makeApiCart({ voucher: null })) as CartWithPromo;

    expect(cart.promoInfo).toBeUndefined();
    // tax still surfaces even without a promo
    expect(cart.totals?.tax).toBe(22000);
  });

  it('falls back to zeros when pricing is missing', () => {
    const cart = mapApiCartToCart(
      makeApiCart({ pricing: undefined as unknown as ApiCart['pricing'] }),
    ) as CartWithPromo;

    expect(cart.subtotal.amount).toBe(0);
    expect(cart.totals?.tax).toBe(0);
  });

  it('keeps voucher typed as a string code (aligned with the API contract)', () => {
    const cart = mapApiCartToCart(
      makeApiCart({
        voucher: 'DISC20',
        pricing: { subtotal: 200000, discount: 40000, tax: 17600, shipping: 0, total: 177600 },
      }),
    ) as CartWithPromo;

    expect(cart.promoInfo?.code).toBe('DISC20');
    expect(typeof cart.promoInfo?.code).toBe('string');
    // sanity: query key helper still works with this cart id
    expect(getCartQueryKey(cart.id)).toContain('cart-1');
  });
});
