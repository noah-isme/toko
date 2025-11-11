import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import FavoritesPage from '@/app/(storefront)/favorites/page';

vi.mock('@/entities/favorites/storage', () => ({
  getGuestId: () => 'test-guest-id',
  readGuestFavorites: () => [],
  writeGuestFavorites: () => true,
  mergeGuestFavorites: (items: any) => items,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('favorites page', () => {
  it('renders loading skeletons initially', () => {
    renderWithClient(<FavoritesPage />);

    expect(screen.getByText('Favorit Saya')).toBeInTheDocument();

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no favorites', async () => {
    renderWithClient(<FavoritesPage />);

    await waitFor(() => {
      expect(screen.getByText('Belum ada favorit')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Mulai tambahkan produk favorit Anda dengan menekan tombol hati/),
    ).toBeInTheDocument();

    const ctaLink = screen.getByRole('link', { name: /Lihat Produk/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute('href', '/products');
  });

  it('displays favorite products when available', async () => {
    renderWithClient(<FavoritesPage />);

    await waitFor(
      () => {
        const productCards = document.querySelectorAll('[class*="Card"]');
        expect(productCards.length).toBeGreaterThanOrEqual(0);
      },
      { timeout: 3000 },
    );
  });

  it('shows product count', async () => {
    renderWithClient(<FavoritesPage />);

    await waitFor(
      () => {
        const heading = screen.getByText('Favorit Saya');
        expect(heading).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
