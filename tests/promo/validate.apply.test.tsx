import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, createTestCart, seedCart } from './utils';

import { PromoField } from '@/entities/promo/ui/PromoField';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function setupPromoHandlers(cartId: string) {
  return [
    http.post(apiPath('/carts/:cartId/apply-voucher'), async ({ request, params }) => {
      // Only handle requests for the specific cart ID used in this test
      if (params.cartId !== cartId) {
        return HttpResponse.json({ valid: false, message: 'Cart not found' }, { status: 404 });
      }
      await delay(500);
      const { code } = (await request.json()) as { code: string };
      const normalized = code.trim().toUpperCase();
      if (normalized === 'EXPIRED') {
        return HttpResponse.json({
          valid: false,
          message: 'Kode promo sudah kedaluwarsa',
        });
      }
      return HttpResponse.json({
        valid: true,
        promo: {
          code: normalized,
          discountType: 'percent',
          value: 10,
          label: 'Diskon 10%',
        },
        appliedSubtotal: 180000,
        finalTotal: 180000,
        message: 'Diskon 10% aktif',
      });
    }),
  ];
}

describe('promo validation and apply flow', () => {
  it('shows optimistic discount preview while apply request is in-flight', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    server.use(...setupPromoHandlers(cart.id));

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText(/masukkan kode/i), 'SAVE10');
    await user.click(screen.getByRole('button', { name: /terapkan/i }));

    expect(await screen.findByText(/^Diskon:/)).toHaveTextContent('Diskon:');
    expect(screen.getByText(/Menerapkan promo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Kode SAVE10 aktif/i)).toBeInTheDocument();
    });
  });

  it('shows validation message when code is expired', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    server.use(...setupPromoHandlers(cart.id));

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText(/masukkan kode/i), 'EXPIRED');
    await user.click(screen.getByRole('button', { name: /terapkan/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/kedaluwarsa/i);
  });
});
