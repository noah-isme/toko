import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FavoritesPage from '@/app/(storefront)/favorites/page';
import { products } from '@/mocks/fixtures';
import { mockAlerts, resetMockAlerts } from '@/mocks/handlers.alerts';
import { server } from '@/mocks/server';

const state = vi.hoisted(() => ({
  auth: undefined as undefined | { isAuthenticated: boolean },
  /** Indexes into the fixture catalog that are favorited. */
  favoriteIndexes: [0, 2] as number[],
}));
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
  return {
    useFavoritesQuery: () => ({
      isLoading: false,
      data: state.favoriteIndexes.map((index) => {
        const p = fixtures.products[index];
        return {
          productId: p.id,
          productName: p.title,
          productSlug: p.slug,
          price: p.price,
          imageUrl: p.imageUrl,
          createdAt: '2026-10-01T00:00:00Z',
        };
      }),
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

/** Records the query string of every GET /alerts the page sends. */
function trackAlertRequests() {
  const seen: string[] = [];
  const listener = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname.endsWith('/alerts')) seen.push(url.search);
  };
  server.events.on('request:start', listener);
  return { seen, stop: () => server.events.removeListener('request:start', listener) };
}

beforeEach(() => {
  resetMockAlerts();
  state.favoriteIndexes = [0, 2];
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

  it('loads alerts once for the whole page, not once per favorite', async () => {
    state.favoriteIndexes = products.map((_, index) => index);
    expect(state.favoriteIndexes.length).toBeGreaterThan(3);
    const tracker = trackAlertRequests();
    try {
      renderPage();
      await waitFor(() => expect(switchFor(watched.title)).toHaveAttribute('aria-checked', 'true'));
      for (const product of products.slice(1)) {
        expect(switchFor(product.title)).toHaveAttribute('aria-checked', 'false');
      }
      expect(tracker.seen).toEqual(['?page=1&limit=100']);
    } finally {
      tracker.stop();
    }
  });

  it('follows pages while totalItems says more alerts exist', async () => {
    const third = products[2];
    // 150 unrelated alerts newer than the seeded ones push them to page 2.
    for (let i = 0; i < 150; i += 1) {
      mockAlerts.items.unshift({
        ...mockAlerts.items[mockAlerts.items.length - 1],
        id: `a1e70000-0000-4000-9000-${String(i).padStart(12, '0')}`,
        type: 'BACK_IN_STOCK',
        productId: products[1].id,
      });
    }
    mockAlerts.items.push({
      id: 'a1e70000-0000-4000-8000-000000000999',
      productId: third.id,
      variantId: null,
      type: 'PRICE_DROP',
      priceAtSubscribe: third.price,
      status: 'active',
      notifiedAt: null,
      createdAt: '2026-10-01T00:00:00Z',
    });
    const tracker = trackAlertRequests();
    try {
      renderPage();
      await waitFor(() => expect(switchFor(third.title)).toHaveAttribute('aria-checked', 'true'));
      expect(switchFor(watched.title)).toHaveAttribute('aria-checked', 'true');
      expect(tracker.seen).toEqual(['?page=1&limit=100', '?page=2&limit=100']);
    } finally {
      tracker.stop();
    }
  });

  it('sends no alerts request for signed-out shoppers', async () => {
    state.auth = undefined;
    const tracker = trackAlertRequests();
    try {
      renderPage();
      expect(switchFor(watched.title)).toHaveAttribute('aria-checked', 'false');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(tracker.seen).toEqual([]);
    } finally {
      tracker.stop();
    }
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
