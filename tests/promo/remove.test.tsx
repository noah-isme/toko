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


async function applyDefaultPromo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/masukkan kode/i), 'SAVE10');
  await user.click(screen.getByRole('button', { name: /terapkan/i }));
  await waitFor(() => expect(screen.getByText(/Kode SAVE10 aktif/i)).toBeInTheDocument());
}

describe('promo removal', () => {
  it('optimistically clears promo and finalizes on success', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    server.use(
      http.post(apiPath('/cart/:cartId/promo/remove'), async () => {
        await delay(400);
        return HttpResponse.json({ valid: false, message: 'Kode promo dihapus' });
      }),
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await applyDefaultPromo(user);
    await user.click(screen.getByRole('button', { name: /hapus kode/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Kode SAVE10 aktif/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Menghapus kode promo/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText(/Menghapus kode promo/i)).not.toBeInTheDocument();
    });
  });

  it('rolls back promo when removal fails', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart();
    seedCart(queryClient, cart);

    server.use(
      http.post(apiPath('/cart/:cartId/promo/remove'), async () => {
        await delay(50);
        return HttpResponse.json({ message: 'Failed' }, { status: 500 });
      }),
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await applyDefaultPromo(user);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /hapus kode/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Kode SAVE10 aktif/i)).toBeInTheDocument();
    });
  });
});
