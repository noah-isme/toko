import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { ProductDetail } from '@/components/product-detail';
import type { ProductDetail as ProductDetailData } from '@/lib/api';

const state = vi.hoisted(() => ({
  product: null as unknown,
  mutate: vi.fn(),
}));

vi.mock('@/entities/catalog/hooks', () => ({
  useProduct: () => ({ data: state.product, isLoading: false, isFetching: false, error: null }),
}));
vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({ mutate: state.mutate, isProductInFlight: () => false }),
}));
vi.mock('@/stores/cart-store', () => ({
  useCartStore: () => ({ cartId: 'cart-1' }),
}));
vi.mock('@/entities/favorites/ui/FavToggle', () => ({ FavToggle: () => null }));
vi.mock('@/components/product-recommendations', () => ({ ProductRecommendations: () => null }));
vi.mock('@/components/product-image-gallery', () => ({ ProductImageGallery: () => null }));

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let observerCallback: ObserverCallback | null = null;
const observed: Element[] = [];

class IntersectionObserverMock {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }

  observe(element: Element) {
    observed.push(element);
  }

  disconnect() {}

  unobserve() {}
}

const detail = {
  id: 'p1',
  title: 'Oak Chair',
  slug: 'oak-chair',
  description: 'A sturdy oak chair.',
  price: 250000,
  currency: 'IDR',
  stock: 20,
  inStock: true,
  rating: 4,
  reviewCount: 3,
  images: [],
  updatedAt: '2026-10-01T00:00:00Z',
  variants: [
    { id: 'v1', sku: 'OAK-1', price: 250000, stock: 12, attributes: { color: 'Natural' } },
    { id: 'v2', sku: 'OAK-2', price: 275000, stock: 3, attributes: { color: 'Walnut' } },
    { id: 'v3', sku: 'OAK-3', price: 250000, stock: 0, attributes: { color: 'Ebony' } },
  ],
} as ProductDetailData;

beforeEach(() => {
  state.product = detail;
  state.mutate.mockClear();
  observerCallback = null;
  observed.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.stickyCta;
});

describe('product detail variant picker', () => {
  it('exposes the selection with aria-pressed and switches on click', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    const natural = screen.getByRole('button', { name: /Natural/ });
    const walnut = screen.getByRole('button', { name: /Walnut/ });
    expect(natural).toHaveAttribute('aria-pressed', 'true');
    expect(walnut).toHaveAttribute('aria-pressed', 'false');

    await user.click(walnut);

    expect(walnut).toHaveAttribute('aria-pressed', 'true');
    expect(natural).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks sold-out variants as disabled and distinct from the selection', () => {
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    const ebony = screen.getByRole('button', { name: /Ebony/ });
    expect(ebony).toBeDisabled();
    expect(ebony).toHaveAttribute('data-state', 'sold-out');
    expect(ebony.className).toContain('border-dashed');
    expect(screen.getByRole('button', { name: /Natural/ })).toHaveAttribute(
      'data-state',
      'selected',
    );
  });

  it('emphasizes low stock', () => {
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    const variants = screen.getByLabelText('Choose a variant');
    expect(within(variants).getByText('12 available')).toBeInTheDocument();
    expect(within(variants).getByText('Only 3 left')).toBeInTheDocument();
  });

  it('shows the low-stock text in Indonesian by default', () => {
    renderWithIntl(<ProductDetail slug="oak-chair" />);

    expect(screen.getByText('Hanya tersisa 3')).toBeInTheDocument();
  });
});

describe('sticky mobile add-to-cart bar', () => {
  it('does not render without IntersectionObserver support', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    expect(screen.queryByTestId('sticky-add-to-cart-bar')).not.toBeInTheDocument();
  });

  it('appears only while the main button is off screen and adds to cart', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    const user = userEvent.setup();
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    expect(observed).toHaveLength(1);
    expect(observed[0]).toContainElement(screen.getByTestId('add-to-cart'));
    expect(screen.queryByTestId('sticky-add-to-cart-bar')).not.toBeInTheDocument();

    act(() => observerCallback?.([{ isIntersecting: false }]));

    const bar = screen.getByRole('region', { name: 'Quick add to cart' });
    expect(bar).toHaveClass('lg:hidden', 'fixed');
    expect(within(bar).getByText('Oak Chair · Natural')).toBeInTheDocument();
    expect(document.body.dataset.stickyCta).toBe('');

    await user.click(within(bar).getByTestId('sticky-add-to-cart'));
    expect(state.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'p1', variantId: 'v1', quantity: 1 }),
    );

    act(() => observerCallback?.([{ isIntersecting: true }]));

    expect(screen.queryByTestId('sticky-add-to-cart-bar')).not.toBeInTheDocument();
    expect(document.body.dataset.stickyCta).toBeUndefined();
  });

  it('shows the out-of-stock state in the bar', () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    state.product = { ...detail, inStock: false, stock: 0, variants: [] };
    renderWithIntl(<ProductDetail slug="oak-chair" />, { locale: 'en' });

    act(() => observerCallback?.([{ isIntersecting: false }]));

    expect(screen.getByTestId('sticky-add-to-cart')).toBeDisabled();
    expect(screen.getByTestId('sticky-add-to-cart')).toHaveTextContent('Out of stock');
  });
});
