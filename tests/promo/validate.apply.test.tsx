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


describe('promo validation and apply flow', () => {
  it('shows optimistic discount preview while apply request is in-flight', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    server.use(
      http.post(apiPath('/cart/:cartId/promo/apply'), async ({ request }) => {
        await delay(500);
        const { code } = (await request.json()) as { code: string };
        return HttpResponse.json({
          valid: true,
          promo: {
            code,
            discountType: 'percent',
            value: 10,
            label: 'Diskon 10%',
          },
          appliedSubtotal: cart.subtotal.amount * 0.9,
          finalTotal: cart.subtotal.amount * 0.9,
          message: 'Diskon 10% aktif',
        });
      }),
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText(/masukkan kode/i), 'SAVE10');
    await user.click(screen.getByRole('button', { name: /terapkan/i }));

    expect(await screen.findByText(/diskon/i)).toHaveTextContent('Diskon:');
    expect(screen.getByText(/Menerapkan promo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Kode SAVE10 aktif/i)).toBeInTheDocument();
    });
  });

  it('shows validation message when code is expired', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

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
