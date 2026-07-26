import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchAutocomplete } from '@/components/search-autocomplete';
import { useSearchStore } from '@/stores/search-store';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('search autocomplete history', () => {
  beforeEach(() => {
    push.mockClear();
    useSearchStore.setState({ term: '', recentSearches: [] });
  });

  it('stores a submitted term in recent searches', async () => {
    const user = userEvent.setup();
    render(<SearchAutocomplete />, { wrapper });

    const input = screen.getByLabelText('Search products');
    await user.type(input, 'kamera{Enter}');

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera']);
    expect(push).toHaveBeenCalledWith('/products?q=kamera');
  });

  it('offers stored searches when the field is focused and empty', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['laptop'] });

    render(<SearchAutocomplete />, { wrapper });
    await user.click(screen.getByLabelText('Search products'));

    expect(screen.getByText('Pencarian Terakhir')).toBeInTheDocument();
    expect(screen.getByText('laptop')).toBeInTheDocument();
  });

  it('hides the recent section entirely when there is no history', async () => {
    const user = userEvent.setup();
    render(<SearchAutocomplete />, { wrapper });

    await user.click(screen.getByLabelText('Search products'));

    expect(screen.queryByText('Pencarian Terakhir')).not.toBeInTheDocument();
    // Popular searches remain as the fallback suggestion list.
    expect(screen.getByText('Popular Searches')).toBeInTheDocument();
  });

  it('re-runs a stored search when clicked', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['headphone'] });

    render(<SearchAutocomplete />, { wrapper });
    await user.click(screen.getByLabelText('Search products'));
    await user.click(screen.getByText('headphone'));

    expect(push).toHaveBeenCalledWith('/products?q=headphone');
  });

  it('removes a single stored search from the dropdown', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['laptop', 'kamera'] });

    render(<SearchAutocomplete />, { wrapper });
    await user.click(screen.getByLabelText('Search products'));
    await user.click(screen.getByLabelText('Hapus laptop dari riwayat pencarian'));

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera']);
  });

  it('clears the whole history from the dropdown', async () => {
    const user = userEvent.setup();
    useSearchStore.setState({ recentSearches: ['laptop', 'kamera'] });

    render(<SearchAutocomplete />, { wrapper });
    await user.click(screen.getByLabelText('Search products'));
    await user.click(screen.getByRole('button', { name: 'Hapus semua' }));

    expect(useSearchStore.getState().recentSearches).toEqual([]);
  });
});
