import { describe, expect, it } from 'vitest';

import { mapApiCartToCart } from '@/lib/api/mappers/cart';
import type { Cart as ApiCart } from '@/lib/api/types';

type ApiResponse<T> = { data: T };

async function fetchCart(cartId: string): Promise<ApiCart> {
  // MSW's apiPath matcher uses a `*/` prefix, so any origin works here.
  const res = await fetch(`http://localhost/api/v1/carts/${cartId}`);
  const body = (await res.json()) as ApiResponse<ApiCart>;
  return body.data;
}

describe('GET /carts/:cartId honors the requested cartId', () => {
  it('echoes the requested id back in the response (not a fixed singleton id)', async () => {
    const first = await fetchCart('cart-abc');
    expect(first.id).toBe('cart-abc');

    // A different id must come back reflected too — proving the handler reads the
    // param instead of always returning the same singleton id.
    const second = await fetchCart('cart-xyz');
    expect(second.id).toBe('cart-xyz');
  });

  it('keeps the mapped cart id aligned with the query key the client used', async () => {
    const raw = await fetchCart('cart-777');
    const mapped = mapApiCartToCart(raw);
    // The mapped id is what getCartQueryKey(cartId) keys on; a mismatch here is the
    // root cause of background refetches clobbering seeded caches.
    expect(mapped.id).toBe('cart-777');
  });

  it('still serves the shared cart contents under whichever id is requested', async () => {
    // Guard against over-correction: echoing the id must not blank out the cart.
    const cart = await fetchCart('cart-contents');
    expect(Array.isArray(cart.items)).toBe(true);
    expect(cart.items.length).toBeGreaterThan(0);
    expect(cart.pricing.subtotal).toBeGreaterThan(0);
  });

  it('leaves the collection route (GET /carts) using the singleton id', async () => {
    // Sanity: only the :cartId route echoes; the id-less collection route keeps its own id.
    const res = await fetch('http://localhost/api/v1/carts');
    const body = (await res.json()) as ApiResponse<ApiCart>;
    expect(typeof body.data.id).toBe('string');
    expect(body.data.id).not.toBe('cart-contents');
  });
});
