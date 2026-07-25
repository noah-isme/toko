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
    http.post(apiPath('/vouchers/preview'), async ({ request }) => {
      const { code } = (await request.json()) as { code: string };
      const normalized = code.trim().toUpperCase();
      await delay(500);
      if (normalized === 'EXPIRED') {
        return HttpResponse.json({
          eligible: false,
          discount: 0,
          eligibleSubtotal: 0,
          finalTotal: 0,
          voucher: {
            id: '',
            code: '',
            kind: 'fixed_amount',
            value: 0,
            minSpend: 0,
            usedCount: 0,
            validFrom: '',
            validTo: '',
            productIds: [],
            categoryIds: [],
            brandIds: [],
            combinable: false,
            priority: 0,
            createdAt: '',
            updatedAt: '',
            tenantId: '',
          },
          message: 'Kode promo sudah kedaluwarsa',
        });
      }
      return HttpResponse.json({
        eligible: true,
        discount: 20000,
        eligibleSubtotal: 200000,
        finalTotal: 180000,
        voucher: {
          id: 'voucher-1',
          code: normalized,
          kind: 'percent',
          value: 0,
          percentBps: 1000,
          minSpend: 100000,
          usageLimit: 100,
          usedCount: 0,
          perUserLimit: 1,
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z',
          productIds: [],
          categoryIds: [],
          brandIds: [],
          combinable: false,
          priority: 10,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          tenantId: 'tenant-1',
        },
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
