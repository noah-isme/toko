import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FavoritesPage from '@/app/(storefront)/favorites/page';
import { products } from '@/mocks/fixtures';
import { mockAlerts, resetMockAlerts } from '@/mocks/handlers.alerts';

const state = vi.hoisted(() => ({ auth: undefined as undefined | { isAuthenticated: boolean } }));
const toastMock = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => state.auth ?? { isAuthenticated: false },
  useOptionalAuth: () => state.auth,
}));
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/entities/favorites/storage', () => ({
  getGuestId: () => 'guest-1',
  readGuestFavorites: () => [],
  writeGuestFavorites: () => true,
  mergeGuestFavorites: (items: unknown) => items,
}));

const [watched, other] = products;

vi.mock('@/entities/favorites/hooks', async () => {
  const fixtures = await import('@/mocks/fixtures');
  const [a, , c] = fixtures.products;
  return {
    useFavoritesQuery: () => ({
      isLoading: false,
      data: [a, c].map((p) => ({
        productId: p.id,
        productName: p.title,
        productSlug: p.slug,
        price: p.price,
        imageUrl: p.imageUrl,
        createdAt: '2026-10-01T00:00:00Z',
      })),
    }),
    useIsFavorite: () => true,
    useAddFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
    useRemoveFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FavoritesPage />
    </QueryClientProvider>,
  );
}

function switchFor(name: string) {
  return screen.getByRole('switch', { name: `Kabari jika harga turun: ${name}` });
}

beforeEach(() => {
  resetMockAlerts();
  toastMock.mockClear();
  state.auth = { isAuthenticated: true };
  window.history.replaceState(null, '', '/favorites');
});

describe('price-drop toggle on favorites', () => {
  it('shows one labelled switch per favorite with the saved state', async () => {
    renderPage();
    const third = products[2];

    await waitFor(() => expect(switchFor(watched.title)).toHaveAttribute('aria-checked', 'true'));
    expect(switchFor(third.title)).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('switch', { name: new RegExp(other.title) })).toBeNull();
  });

  it('turns a price alert on and off', async () => {
    renderPage();
    const third = products[2];
    await waitFor(() => expect(switchFor(third.title)).toBeEnabled());

    await userEvent.click(switchFor(third.title));

    await waitFor(() => expect(switchFor(third.title)).toHaveAttribute('aria-checked', 'true'));
    expect(
      mockAlerts.items.find((a) => a.productId === third.id && a.type === 'PRICE_DROP'),
    ).toMatchObject({ status: 'active', priceAtSubscribe: third.price, variantId: null });
    expect(toastMock).toHaveBeenCalledWith({
      variant: 'success',
      description: 'Kami akan mengabari Anda jika harganya turun.',
    });

    await userEvent.click(switchFor(third.title));

    await waitFor(() => expect(switchFor(third.title)).toHaveAttribute('aria-checked', 'false'));
    expect(mockAlerts.items.some((a) => a.productId === third.id)).toBe(false);
  });

  it('asks signed-out shoppers to sign in and come back to favorites', async () => {
    state.auth = undefined;
    renderPage();

    await userEvent.click(switchFor(watched.title));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Masuk' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Ffavorites',
    );
    // The page behind the modal is aria-hidden; the switch stays off.
    expect(
      screen.getByRole('switch', {
        name: `Kabari jika harga turun: ${watched.title}`,
        hidden: true,
      }),
    ).toHaveAttribute('aria-checked', 'false');
  });
});
