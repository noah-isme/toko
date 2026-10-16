import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient, createTestCart, seedCart } from '../promo/utils';
import { TEST_MESSAGES } from '../utils/next-intl-mock';
import { renderWithIntl } from '../utils/renderWithIntl';

import { useRemoveCartItemMutation, useUpdateCartItemMutation } from '@/entities/cart/hooks';
import { PromoField } from '@/entities/promo/ui/PromoField';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';
import type { CartView } from '@/lib/api/schemas';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const toast = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/toast')>();
  return { ...actual, useToast: () => ({ ...actual.useToast(), toast }) };
});

function englishWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale="en"
        messages={TEST_MESSAGES.en}
        timeZone={TIME_ZONE}
        formats={FORMATS}
      >
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

function cartWithItem(): CartView {
  return {
    ...createTestCart('cart-i18n'),
    items: [
      {
        id: 'item-1',
        productId: 'p1',
        variantId: null,
        name: 'Oak Chair',
        quantity: 1,
        price: { amount: 100000, currency: 'IDR' },
        image: null,
        maxQuantity: 5,
      },
    ],
    itemCount: 1,
  } as CartView;
}

beforeEach(() => {
  toast.mockClear();
});

describe('cart mutation toasts in English', () => {
  it('reports a failed removal', async () => {
    server.use(
      http.delete(apiPath('/carts/:cartId/items/:itemId'), () =>
        HttpResponse.json({ message: 'Unable to delete' }, { status: 500 }),
      ),
    );
    const client = createQueryClient();
    const cart = cartWithItem();
    seedCart(client, cart);

    const { result } = renderHook(() => useRemoveCartItemMutation(), {
      wrapper: englishWrapper(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ itemId: 'item-1', cartId: cart.id }).catch(() => {});
    });

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to remove item', variant: 'destructive' }),
      ),
    );
  });

  it('reports a failed quantity update', async () => {
    server.use(
      http.patch(apiPath('/carts/:cartId/items/:itemId'), () =>
        HttpResponse.json({ message: 'Nope' }, { status: 500 }),
      ),
    );
    const client = createQueryClient();
    const cart = cartWithItem();
    seedCart(client, cart);

    const { result } = renderHook(() => useUpdateCartItemMutation(), {
      wrapper: englishWrapper(client),
    });
    await act(async () => {
      await result.current
        .mutateAsync({ itemId: 'item-1', quantity: 2, cartId: cart.id })
        .catch(() => {});
    });

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Failed to update quantity' }),
      ),
    );
  });
});

describe('promo field in English', () => {
  it('translates the schema validation message', async () => {
    const client = createQueryClient();
    const cart = createTestCart();
    seedCart(client, cart);
    const user = userEvent.setup();

    renderWithIntl(
      <QueryClientProvider client={client}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
      { locale: 'en' },
    );

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Promo code is required');
  });

  it('keeps the Indonesian validation message by default', async () => {
    const client = createQueryClient();
    const cart = createTestCart();
    seedCart(client, cart);
    const user = userEvent.setup();

    renderWithIntl(
      <QueryClientProvider client={client}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kode promo wajib diisi');
  });

  it('toasts the applied code', async () => {
    server.use(
      http.post(apiPath('/carts/:cartId/apply-voucher'), async ({ request }) => {
        const { code } = (await request.json()) as { code: string };
        return HttpResponse.json({
          valid: true,
          promo: { code: code.trim().toUpperCase(), discountType: 'percent', value: 10 },
          appliedSubtotal: 180000,
          finalTotal: 180000,
        });
      }),
    );
    const client = createQueryClient();
    const cart = createTestCart();
    seedCart(client, cart);
    const user = userEvent.setup();

    renderWithIntl(
      <QueryClientProvider client={client}>
        <PromoField cartId={cart.id} />
      </QueryClientProvider>,
      { locale: 'en' },
    );

    await user.type(screen.getByLabelText('Enter code'), 'save10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Promo code applied',
          description: 'Code SAVE10 active',
        }),
      ),
    );
  });
});
