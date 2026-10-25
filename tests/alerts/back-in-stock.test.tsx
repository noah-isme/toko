import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductDetail } from '@/components/product-detail';
import type { ProductDetail as ProductDetailData } from '@/lib/api';
import { resetMockAlerts } from '@/mocks/handlers.alerts';
import { server } from '@/mocks/server';

const PRODUCT_ID = '6f1c2a3b-0000-4000-8000-000000000001';
const SOLD_OUT_VARIANT = '6f1c2a3b-0000-4000-8000-0000000000b2';

const state = vi.hoisted(() => ({
  product: null as unknown,
  isAuthenticated: false,
}));
const toastMock = vi.fn();

vi.mock('@/entities/catalog/hooks', () => ({
  useProduct: () => ({
    data: state.product,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));
vi.mock('@/components/product-recommendations', () => ({ ProductRecommendations: () => null }));
vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/entities/favorites/hooks', () => ({
  useIsFavorite: () => false,
  useAddFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
  useRemoveFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: state.isAuthenticated, user: null }),
}));
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }));

const withVariants = {
  id: PRODUCT_ID,
  title: 'Oak Chair',
  slug: 'oak-chair',
  description: 'A sturdy oak chair.',
  price: 250000,
  currency: 'IDR',
  stock: 2,
  inStock: true,
  rating: 4,
  reviewCount: 3,
  images: [],
  variants: [
    { id: 'v-natural', sku: 'OAK-1', price: 250000, stock: 2, attributes: { color: 'Natural' } },
    {
      id: SOLD_OUT_VARIANT,
      sku: 'OAK-2',
      price: 260000,
      stock: 0,
      attributes: { color: 'Walnut' },
    },
  ],
} as unknown as ProductDetailData;

const soldOutProduct = {
  ...withVariants,
  stock: 0,
  inStock: false,
  variants: [],
} as unknown as ProductDetailData;

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductDetail slug="oak-chair" />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  resetMockAlerts();
  toastMock.mockClear();
  state.product = withVariants;
  state.isAuthenticated = false;
  window.history.replaceState(null, '', '/products/oak-chair?ref=home');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('notify me on product detail', () => {
  it('is hidden while the selected variant has stock', () => {
    renderDetail();

    expect(screen.getByTestId('add-to-cart')).toBeEnabled();
    expect(screen.queryByTestId('notify-me')).not.toBeInTheDocument();
  });

  it('appears for a sold-out variant, which can now be selected', async () => {
    renderDetail();

    const walnut = screen.getByRole('button', { name: /Walnut/ });
    expect(walnut).toBeEnabled();
    await userEvent.click(walnut);

    expect(walnut).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('add-to-cart')).toBeDisabled();
    expect(screen.getByTestId('notify-me')).toHaveTextContent('Ingatkan saya saat tersedia');
  });

  it('follows the cart rule: a variant with stock is sellable even if the product is flagged out of stock', () => {
    state.product = { ...withVariants, inStock: false };
    renderDetail();

    expect(screen.getByTestId('add-to-cart')).toBeEnabled();
    expect(screen.queryByTestId('notify-me')).not.toBeInTheDocument();
  });

  it('asks signed-out shoppers to sign in and return to the product', async () => {
    state.product = soldOutProduct;
    renderDetail();

    await userEvent.click(screen.getByTestId('notify-me'));

    const dialog = await screen.findByRole('dialog', {
      name: 'Masuk untuk mengaktifkan pengingat',
    });
    expect(within(dialog).getByRole('link', { name: 'Masuk' })).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent('/products/oak-chair?ref=home')}`,
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Nanti saja' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('subscribes a sold-out variant, then cancels the alert', async () => {
    state.isAuthenticated = true;
    const alerts: Array<Record<string, unknown>> = [];
    const posted: unknown[] = [];
    const deleted: string[] = [];
    const toDto = (body: Record<string, unknown>) => ({
      id: 'a1e70000-0000-4000-8000-0000000000aa',
      productId: body.productId,
      variantId: body.variantId ?? null,
      type: body.type,
      priceAtSubscribe: null,
      status: 'active',
      notifiedAt: null,
      createdAt: '2026-10-25T00:00:00Z',
      product: {
        title: 'Oak Chair',
        slug: 'oak-chair',
        thumbnail: null,
        price: 250000,
        inStock: true,
      },
      variant: { id: SOLD_OUT_VARIANT, sku: 'OAK-2', price: 260000, stock: 0 },
    });
    server.use(
      http.get('*/alerts', ({ request }) => {
        expect(new URL(request.url).searchParams.get('productId')).toBe(PRODUCT_ID);
        return HttpResponse.json({
          data: alerts,
          pagination: { page: 1, perPage: 100, totalItems: alerts.length },
        });
      }),
      http.post('*/alerts', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        posted.push(body);
        const dto = toDto(body);
        alerts.push(dto);
        return HttpResponse.json({ data: dto }, { status: 201 });
      }),
      http.delete('*/alerts/:id', ({ params }) => {
        deleted.push(String(params.id));
        alerts.splice(0, alerts.length);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderDetail();

    await userEvent.click(screen.getByRole('button', { name: /Walnut/ }));
    await waitFor(() => expect(screen.getByTestId('notify-me')).toBeEnabled());
    await userEvent.click(screen.getByTestId('notify-me'));

    const active = await screen.findByText('Kami akan mengabari Anda saat stok tersedia.');
    // Announced once, through the wrapper's polite live region (no nested role=status).
    expect(active.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(posted).toEqual([
      { productId: PRODUCT_ID, variantId: SOLD_OUT_VARIANT, type: 'BACK_IN_STOCK' },
    ]);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Pengingat stok aktif' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Batalkan pengingat' }));

    await waitFor(() => expect(screen.getByTestId('notify-me')).toBeInTheDocument());
    expect(deleted).toEqual(['a1e70000-0000-4000-8000-0000000000aa']);
  });

  it('explains a 409 ALREADY_IN_STOCK race', async () => {
    state.isAuthenticated = true;
    state.product = soldOutProduct;
    server.use(
      http.get('*/alerts', () =>
        HttpResponse.json({ data: [], pagination: { page: 1, perPage: 100, totalItems: 0 } }),
      ),
      http.post('*/alerts', () =>
        HttpResponse.json(
          { error: { code: 'ALREADY_IN_STOCK', message: 'product is already in stock' } },
          { status: 409 },
        ),
      ),
    );
    renderDetail();

    await waitFor(() => expect(screen.getByTestId('notify-me')).toBeEnabled());
    await userEvent.click(screen.getByTestId('notify-me'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        variant: 'destructive',
        description: 'Produk ini sudah tersedia lagi. Silakan langsung dibeli.',
      }),
    );
  });
});
