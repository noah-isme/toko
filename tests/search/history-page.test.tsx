import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SearchHistoryPage from '@/app/(storefront)/account/searches/page';
import { useSearchStore } from '@/stores/search-store';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/account/searches',
  useSearchParams: () => new URLSearchParams(),
}));

describe('search history page', () => {
  beforeEach(() => {
    push.mockClear();
    useSearchStore.setState({ term: '', recentSearches: [] });
  });

  it('shows an empty state when nothing has been searched', () => {
    render(<SearchHistoryPage />);

    expect(screen.getByText('Belum ada riwayat pencarian')).toBeInTheDocument();
  });

  it('lists stored searches', () => {
    useSearchStore.setState({ recentSearches: ['laptop', 'kamera'] });

    render(<SearchHistoryPage />);

    expect(screen.getByText('laptop')).toBeInTheDocument();
    expect(screen.getByText('kamera')).toBeInTheDocument();
  });

  it('re-runs a stored search against the catalog', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['kamera mirrorless'] });

    render(<SearchHistoryPage />);
    await user.click(screen.getByText('kamera mirrorless'));

    expect(push).toHaveBeenCalledWith('/products?q=kamera%20mirrorless');
  });

  it('removes a single entry', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['laptop', 'kamera'] });

    render(<SearchHistoryPage />);
    await user.click(screen.getByLabelText('Hapus laptop dari riwayat pencarian'));

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera']);
  });

  it('clears the whole history', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['laptop', 'kamera'] });

    render(<SearchHistoryPage />);
    await user.click(screen.getByRole('button', { name: /hapus semua/i }));

    expect(useSearchStore.getState().recentSearches).toEqual([]);
    expect(screen.getByText('Belum ada riwayat pencarian')).toBeInTheDocument();
  });
});
