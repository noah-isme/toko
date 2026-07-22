import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse, http } from 'msw';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import ComparePage from '@/app/(storefront)/compare/page';
import type { Product } from '@/lib/api';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';
import { useCompareStore } from '@/stores/compare-store';

const products: Product[] = [
  {
    id: 'p1',
    title: 'Product Alpha',
    slug: 'product-alpha',
    price: 150000,
    currency: 'IDR',
    rating: 4.5,
    reviewCount: 12,
    brandName: 'Brand A',
    categoryName: 'Electronics',
    stock: 10,
    inStock: true,
    description: 'Alpha description text',
  },
  {
    id: 'p2',
    title: 'Product Beta',
    slug: 'product-beta',
    price: 200000,
    currency: 'IDR',
    rating: 3,
    reviewCount: 5,
    brandName: 'Brand B',
    categoryName: 'Audio',
    stock: 0,
    inStock: false,
    description: 'Beta description text',
  },
];

function productsResponse() {
  return HttpResponse.json({
    data: products,
    pagination: { page: 1, perPage: 20, totalItems: products.length },
  });
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('compare page', () => {
  beforeEach(() => {
    (globalThis as { React?: typeof React }).React = React;
    useCompareStore.setState({ productIds: [] });
  });

  it('renders the empty state with a CTA when nothing is selected', () => {
    renderWithClient(<ComparePage />);

    expect(
      screen.getByRole('heading', { name: /belum ada produk untuk dibandingkan/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pilih hingga 3 produk/i)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /jelajahi produk/i });
    expect(cta).toHaveAttribute('href', '/products');
  });

  it('shows a loading message while products are being fetched', () => {
    server.use(
      http.get(apiPath('/products'), async () => {
        await delay(10_000);
        return productsResponse();
      }),
    );
    useCompareStore.setState({ productIds: ['p1'] });

    renderWithClient(<ComparePage />);

    expect(screen.getByRole('heading', { name: 'Perbandingan Produk' })).toBeInTheDocument();
    expect(screen.getByText(/memuat produk/i)).toBeInTheDocument();
  });

  it('renders the comparison table with product details', async () => {
    server.use(http.get(apiPath('/products'), productsResponse));
    useCompareStore.setState({ productIds: ['p1', 'p2'] });

    renderWithClient(<ComparePage />);

    await waitFor(() => {
      expect(screen.getByText('Product Alpha')).toBeInTheDocument();
    });

    // Product titles link to their detail pages.
    expect(screen.getByRole('link', { name: 'Product Alpha' })).toHaveAttribute(
      'href',
      '/products/product-alpha',
    );
    expect(screen.getByRole('link', { name: 'Product Beta' })).toHaveAttribute(
      'href',
      '/products/product-beta',
    );

    // Row labels
    for (const label of ['Harga', 'Rating', 'Brand', 'Kategori', 'Stok', 'Deskripsi']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // Stock status
    expect(screen.getByText(/Tersedia/i)).toBeInTheDocument();
    expect(screen.getByText('Habis')).toBeInTheDocument();
  });

  it('removes a product when its remove button is clicked', async () => {
    server.use(http.get(apiPath('/products'), productsResponse));
    useCompareStore.setState({ productIds: ['p1', 'p2'] });

    renderWithClient(<ComparePage />);

    await waitFor(() => screen.getByText('Product Alpha'));

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /hapus product alpha dari perbandingan/i }),
    );

    expect(useCompareStore.getState().productIds).toEqual(['p2']);
  });

  it('clears all products when the clear button is clicked', async () => {
    server.use(http.get(apiPath('/products'), productsResponse));
    useCompareStore.setState({ productIds: ['p1', 'p2'] });

    renderWithClient(<ComparePage />);

    await waitFor(() => screen.getByText('Product Alpha'));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /kosongkan perbandingan/i }));

    expect(useCompareStore.getState().productIds).toEqual([]);
  });
});
