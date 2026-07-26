import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SavedForLater } from '@/components/saved-for-later';
import { useSavedForLaterStore, type SavedItem } from '@/stores/saved-for-later-store';

const mutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/api/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/hooks')>();
  return {
    ...actual,
    useAddToCartMutation: () => ({
      mutateAsync,
      isProductInFlight: () => false,
    }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function savedItem(overrides: Partial<SavedItem> = {}): SavedItem {
  return {
    productId: 'p1',
    name: 'Kaos Hitam Polos',
    quantity: 2,
    price: { amount: 100000, currency: 'IDR' },
    image: null,
    ...overrides,
  };
}

describe('SavedForLater', () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    useSavedForLaterStore.setState({ items: [] });
  });

  it('renders nothing when no items are parked', () => {
    const { container } = render(<SavedForLater cartId="cart-1" />, { wrapper });

    expect(container).toBeEmptyDOMElement();
  });

  it('lists parked items with a count', () => {
    useSavedForLaterStore.setState({
      items: [savedItem(), savedItem({ productId: 'p2', name: 'Sony PS5' })],
    });

    render(<SavedForLater cartId="cart-1" />, { wrapper });

    expect(screen.getByText('Disimpan untuk nanti (2)')).toBeInTheDocument();
    expect(screen.getByText('Kaos Hitam Polos')).toBeInTheDocument();
    expect(screen.getByText('Sony PS5')).toBeInTheDocument();
  });

  it('moves an item back into the cart and drops the snapshot', async () => {
    const user = userEvent.setup();
    useSavedForLaterStore.setState({ items: [savedItem()] });

    render(<SavedForLater cartId="cart-1" />, { wrapper });
    await user.click(screen.getByRole('button', { name: /pindahkan ke keranjang/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'p1', quantity: 2, cartId: 'cart-1' }),
      );
    });
    await waitFor(() => {
      expect(useSavedForLaterStore.getState().items).toEqual([]);
    });
  });

  it('keeps the item parked when moving it back fails', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(new Error('network down'));
    useSavedForLaterStore.setState({ items: [savedItem()] });

    render(<SavedForLater cartId="cart-1" />, { wrapper });
    await user.click(screen.getByRole('button', { name: /pindahkan ke keranjang/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });
    // The snapshot is the only remaining record of the item — losing it on a
    // failed move would discard the shopper's selection.
    expect(useSavedForLaterStore.getState().items).toHaveLength(1);
  });

  it('discards a parked item on request', async () => {
    const user = userEvent.setup();
    useSavedForLaterStore.setState({ items: [savedItem()] });

    render(<SavedForLater cartId="cart-1" />, { wrapper });
    await user.click(screen.getByRole('button', { name: 'Hapus' }));

    expect(useSavedForLaterStore.getState().items).toEqual([]);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
