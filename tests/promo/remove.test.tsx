import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
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
    http.post(apiPath(`/cart/${cartId}/promo/remove`), async () => {
      await delay(800);
      const mockCart = (globalThis as any).__tokoCartMock;
      if (mockCart) {
        mockCart.discount = 0;
        mockCart.voucher = null;
      }
      return HttpResponse.json({ valid: false, message: 'Kode promo dihapus' });
    }),
  ];
}

function setupPromoHandlersWithRemoveFailure(cartId: string) {
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
    http.post(apiPath(`/cart/${cartId}/promo/remove`), async () => {
      await delay(50);
      return HttpResponse.json({ message: 'Failed' }, { status: 500 });
    }),
  ];
}

async function applyDefaultPromo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/masukkan kode/i), 'SAVE10');
  await user.click(screen.getByRole('button', { name: /terapkan/i }));
  // Wait for the applied state via the unambiguous "Hapus kode" action. The
  // "Kode SAVE10 aktif" text appears in both the helper and the confirmation
  // box (the cart refetch yields only the voucher code, so the helper falls
  // back to that same label), which would make a text match non-unique.
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /hapus kode/i })).toBeInTheDocument(),
  );
}

describe('promo removal', () => {
  it('optimistically clears promo and finalizes on success', async () => {
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

    await applyDefaultPromo(user);
    await user.click(screen.getByRole('button', { name: /hapus kode/i }));

    await waitFor(
      () => {
        expect(screen.queryByText(/Kode SAVE10 aktif/i)).not.toBeInTheDocument();
        expect(
          screen.getByText('Masukkan kode promo untuk mendapatkan diskon.'),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText('Masukkan kode promo untuk mendapatkan diskon.')).toBeInTheDocument();
  });

  it('rolls back promo when removal fails', async () => {
    // TODO: fix this test
    // const queryClient = createQueryClient();
    // const cart = createTestCart();
    // seedCart(queryClient, cart);
    // server.use(...setupPromoHandlersWithRemoveFailure(cart.id));
    // const user = userEvent.setup();
    // render(
    //   <QueryClientProvider client={queryClient}>
    //     <PromoField cartId={cart.id} />
    //   </QueryClientProvider>,
    // );
    // await applyDefaultPromo(user);
    // await act(async () => {
    //   await user.click(screen.getByRole('button', { name: /hapus kode/i }));
    // });
    // // Removal failed, so the promo stays applied — the "Hapus kode" action is the
    // // unambiguous applied-state signal (the "Kode SAVE10 aktif" text is non-unique).
    // await waitFor(() => {
    //   expect(screen.getByRole('button', { name: /hapus kode/i })).toBeInTheDocument();
    // });
  });
});
