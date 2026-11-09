import { screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import { SORT_OPTIONS } from '@/entities/search/types';
import type { FacetCountsState } from '@/entities/search/ui/AdvancedFilterSidebar';
import { AdvancedSearchResults } from '@/entities/search/ui/AdvancedSearchResults';
import type { Product, ProductFacets, ProductListResponse } from '@/lib/api/types';

const state = vi.hoisted(() => ({
  params: new URLSearchParams(),
  query: {
    data: undefined as unknown,
    isLoading: false,
    isFetching: false,
  },
  sidebarProps: [] as Array<{ facetCounts?: unknown }>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => state.params,
  usePathname: () => '/products',
}));
vi.mock('@/entities/catalog/hooks', () => ({
  useProducts: () => ({ ...state.query, error: null, refetch: vi.fn() }),
}));
vi.mock('@/entities/search/ui/AdvancedFilterSidebar', () => ({
  AdvancedFilterSidebar: (props: { facetCounts?: unknown }) => {
    state.sidebarProps.push(props);
    return null;
  },
}));
vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/entities/favorites/hooks', () => ({
  useIsFavorite: () => false,
  useAddFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
  useRemoveFavoriteMutation: () => ({ mutate: vi.fn(), isProductInFlight: () => false }),
}));
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

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

const product: Product = {
  id: 'p1',
  title: 'MacBook Pro 14 M3',
  slug: 'macbook-pro-14-m3',
  price: 25000000,
  currency: 'IDR',
  stock: 5,
  inStock: true,
  rating: 4.5,
  reviewCount: 10,
};

const facets: ProductFacets = {
  categories: [{ id: 'c1', name: 'Electronics', slug: 'electronics', count: 1 }],
  brands: [],
  price: { buckets: [{ min: 10000000, max: null, count: 1 }] },
  inStock: { true: 1, false: 0 },
};

function respond(response: Partial<ProductListResponse>) {
  state.query = {
    data: { data: [], pagination: { page: 1, perPage: 12, totalItems: 0 }, ...response },
    isLoading: false,
    isFetching: false,
  };
}

function lastFacetCounts() {
  return state.sidebarProps.at(-1)?.facetCounts as FacetCountsState;
}

describe('product search results: suggestions, fuzzy mode and facets', () => {
  beforeEach(() => {
    state.params = new URLSearchParams();
    state.sidebarProps = [];
    respond({});
  });

  it('offers "did you mean" links to the suggested products when nothing matched', () => {
    state.params = new URLSearchParams('q=macbx');
    respond({
      meta: {
        searchMode: 'fts',
        suggestions: [
          { title: 'MacBook Pro 14 M3', slug: 'macbook-pro-14-m3' },
          { title: 'MacBook Air', slug: 'macbook-air' },
        ],
      },
    });

    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'No products found' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Search suggestions' });
    expect(nav).toHaveTextContent('Did you mean:');
    expect(screen.getByRole('link', { name: 'MacBook Pro 14 M3' })).toHaveAttribute(
      'href',
      '/products/macbook-pro-14-m3',
    );
    expect(screen.getByRole('link', { name: 'MacBook Air' })).toHaveAttribute(
      'href',
      '/products/macbook-air',
    );
  });

  it('shows no suggestion block when the API sends none', () => {
    state.params = new URLSearchParams('q=zzz');
    respond({ meta: { searchMode: 'fts' } });

    renderWithIntl(<AdvancedSearchResults />);

    expect(screen.getByRole('heading', { name: 'Tidak ada produk ditemukan' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Saran pencarian' })).not.toBeInTheDocument();
  });

  it('tells the shopper when results come from the typo-tolerant fallback', () => {
    state.params = new URLSearchParams('q=macbok');
    respond({
      data: [product],
      pagination: { page: 1, perPage: 12, totalItems: 1 },
      meta: { searchMode: 'fuzzy' },
    });

    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });

    expect(screen.getByRole('status')).toHaveTextContent(
      'No exact matches for "macbok". Showing similar products.',
    );
  });

  it('does not show the fuzzy notice for exact matches', () => {
    state.params = new URLSearchParams('q=macbook');
    respond({
      data: [product],
      pagination: { page: 1, perPage: 12, totalItems: 1 },
      meta: { searchMode: 'fts' },
    });

    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });

    expect(screen.queryByText(/Showing similar products/)).not.toBeInTheDocument();
  });

  it('passes facet counts to the sidebar and keeps them while the next page loads', () => {
    respond({ data: [product], pagination: { page: 1, perPage: 12, totalItems: 1 }, facets });
    const { rerender } = renderWithIntl(<AdvancedSearchResults />);
    expect(lastFacetCounts()).toEqual({ data: facets, isLoading: false });

    state.query = { data: undefined, isLoading: true, isFetching: true };
    rerender(<AdvancedSearchResults />);
    expect(lastFacetCounts()).toEqual({ data: facets, isLoading: true });
  });

  it('reports a pending first response so the sidebar can show its skeleton', () => {
    state.query = { data: undefined, isLoading: true, isFetching: true };
    renderWithIntl(<AdvancedSearchResults />);
    expect(lastFacetCounts()).toEqual({ data: undefined, isLoading: true });
  });

  it('labels the price chip of the open-ended bucket as a lower bound', () => {
    state.params = new URLSearchParams('price=10000000,10000000');
    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });
    expect(screen.getByText(/^Price: from /)).toHaveTextContent('10,000,000');
  });

  it('labels a bucket price chip with the bucket edge the sidebar shows', () => {
    // Selecting the 50k-100k bucket stores the inclusive range 50000-99999.
    state.params = new URLSearchParams('price=50000,99999');
    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });
    const chip = screen.getByText(/^Price: /);
    expect(chip).toHaveTextContent('50,000');
    expect(chip).toHaveTextContent('100,000');
    expect(chip).not.toHaveTextContent('99,999');
  });

  it('labels a custom price chip with its own bounds', () => {
    state.params = new URLSearchParams('price=60000,90000');
    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });
    const chip = screen.getByText(/^Price: /);
    expect(chip).toHaveTextContent('60,000');
    expect(chip).toHaveTextContent('90,000');
  });

  it('selects popularity sort from the URL', () => {
    state.params = new URLSearchParams('sort=popularity');
    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveTextContent('Most Popular');
  });

  it('offers only sorts the product API supports, including popularity and rating', () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual([
      'relevance',
      'popularity',
      'rating',
      'price-asc',
      'price-desc',
      'name-asc',
      'name-desc',
    ]);
  });
});
