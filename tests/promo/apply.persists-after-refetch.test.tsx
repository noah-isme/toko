/**
 * Regression for the checkout promo "reset": after a successful apply the field
 * is cleared (by design) and the cart is refetched. The mock used to forget the
 * voucher, so that refetch dropped `promoInfo` and the user was left with an
 * empty field, no error and no discount. These tests run against the default
 * MSW handlers (no per-test override) so the refetch hits the shared mock cart.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createQueryClient } from './utils';

import { useCartQuery } from '@/entities/cart/hooks';
import { PromoField } from '@/entities/promo/ui/PromoField';
import type { MockCart } from '@/mocks/utils';

function mockCart() {
  const cart = (globalThis as { __tokoCartMock?: MockCart }).__tokoCartMock;
  if (!cart) throw new Error('MSW cart mock is not initialised');
  return cart;
}

function CheckoutPromo({ cartId }: { cartId: string }) {
  // The checkout page keeps its own subscription to the same cart query.
  const { data: cart } = useCartQuery(cartId);
  return cart ? <PromoField cartId={cartId} /> : <p>loading cart</p>;
}

afterEach(() => {
  const cart = mockCart();
  cart.voucher = null;
  cart.discount = 0;
});

describe('promo apply survives the post-apply cart refetch', () => {
  it('keeps the applied code and discount once the cart has been refetched', async () => {
    const cartId = mockCart().id;
    const queryClient = createQueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <CheckoutPromo cartId={cartId} />
      </QueryClientProvider>,
    );

    const input = await screen.findByLabelText(/masukkan kode/i);
    await user.type(input, 'save10');
    expect(input).toHaveValue('save10');
    await user.click(screen.getByRole('button', { name: /terapkan/i }));

    // A successful apply clears the field; onSettled then invalidates the cart. Wait until
    // that refetch has landed: this is the state the e2e screenshot showed.
    await waitFor(() => {
      expect(input).toHaveValue('');
      expect(queryClient.isMutating()).toBe(0);
      expect(queryClient.isFetching()).toBe(0);
    });

    // The applied-promo panel, fed by the refetched cart's voucher and discount.
    expect(screen.getByText('Kode SAVE10 aktif.')).toBeInTheDocument();
    expect(screen.getByText(/^Diskon:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hapus kode/i })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockCart().voucher).toBe('SAVE10');
  });

  it('clears the persisted voucher when the promo is removed', async () => {
    const cartId = mockCart().id;
    const queryClient = createQueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <CheckoutPromo cartId={cartId} />
      </QueryClientProvider>,
    );

    const input = await screen.findByLabelText(/masukkan kode/i);
    await user.type(input, 'SAVE10');
    await user.click(screen.getByRole('button', { name: /terapkan/i }));
    await waitFor(() => {
      expect(input).toHaveValue('');
      expect(queryClient.isMutating()).toBe(0);
      expect(queryClient.isFetching()).toBe(0);
    });
    await user.click(screen.getByRole('button', { name: /hapus kode/i }));

    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
      expect(queryClient.isFetching()).toBe(0);
    });
    expect(screen.queryAllByText(/Kode SAVE10 aktif/i)).toHaveLength(0);
    expect(screen.getByLabelText(/masukkan kode/i)).toBeEnabled();
    expect(mockCart().voucher).toBeNull();
  });
});
