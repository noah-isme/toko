import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'next-intl';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';
import { renderWithIntl } from '../utils/renderWithIntl';

import { FilterSidebar } from '@/components/filter-sidebar';
import { Pagination } from '@/components/pagination';
import { ProductCard } from '@/components/product-card';
import { AdvancedFilterSidebar } from '@/entities/search/ui/AdvancedFilterSidebar';
import { AdvancedSearchResults } from '@/entities/search/ui/AdvancedSearchResults';
import type { Product } from '@/lib/api';
import { emptyCart, emptyCategoryProducts, emptySearchResults } from '@/shared/ui/empty-presets';
import { useCompareStore } from '@/stores/compare-store';

const searchState = vi.hoisted(() => ({
  params: new URLSearchParams(),
  products: {
    data: [] as unknown[],
    pagination: { totalItems: 0 },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => searchState.params,
  usePathname: () => '/products',
}));
vi.mock('@/entities/catalog/hooks', () => ({
  useProducts: () => ({
    data: searchState.products,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/entities/search/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/search/hooks')>()),
  useSearchFacetsQuery: () => ({
    data: [
      {
        name: 'categories',
        label: 'Kategori',
        type: 'category',
        multiSelect: true,
        values: [{ value: 'fashion', label: 'Fashion', count: 0, selected: false }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSaveSearchMutation: () => ({ mutate: vi.fn() }),
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

const ResizeObserverMock = class {
  observe() {}

  unobserve() {}

  disconnect() {}
};

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const product: Product = {
  id: 'p1',
  title: 'Oak Chair',
  slug: 'oak-chair',
  price: 250000,
  currency: 'IDR',
  stock: 0,
  inStock: false,
  rating: 4,
  reviewCount: 3,
};

describe('catalog listing in English', () => {
  beforeEach(() => {
    searchState.params = new URLSearchParams();
    searchState.products = { data: [], pagination: { totalItems: 0 } };
    useCompareStore.setState({ productIds: [] });
  });

  it('product card translates its actions and toggles', () => {
    renderWithIntl(<ProductCard product={product} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Quick View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to comparison' })).toBeInTheDocument();
  });

  it('product card keeps the Indonesian text by default', () => {
    renderWithIntl(<ProductCard product={{ ...product, stock: 5, inStock: true }} />);

    expect(screen.getByRole('button', { name: 'Lihat Cepat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keranjang' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tambahkan ke favorit' })).toBeInTheDocument();
  });

  it('search results render the header, chips, sort and empty state in English', () => {
    searchState.params = new URLSearchParams('q=chair&inStock=true');

    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Search Results' })).toBeInTheDocument();
    expect(screen.getByText('0 products found for "chair"')).toBeInTheDocument();
    expect(screen.getByText('Search: "chair"')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove filter' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: 'Sort' })).toHaveTextContent('Relevance');
    expect(screen.getByText('Showing 0 - 0 of 0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No products found' })).toBeInTheDocument();
    expect(screen.getByText('Try another keyword or remove some filters')).toBeInTheDocument();
  });

  it('search results pluralise the English count and translate pagination', () => {
    searchState.products = {
      data: [{ ...product, stock: 5, inStock: true }],
      pagination: { totalItems: 1 },
    };

    renderWithIntl(<AdvancedSearchResults />, { locale: 'en' });

    expect(screen.getByText('1 product found')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 - 1 of 1')).toBeInTheDocument();
  });

  it('advanced filter sidebar renders its sections and actions in English', async () => {
    renderWithIntl(
      <AdvancedFilterSidebar
        filters={{ categories: [], brands: [], priceRange: [0, 10000000] }}
        onFiltersChange={vi.fn()}
      />,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Categories' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Price' })[0]).toBeInTheDocument();
    expect(screen.getAllByText('Price Range')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alert' })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText('Filter Products')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('legacy filter sidebar translates its sections', () => {
    renderWithIntl(
      <FilterSidebar
        categories={['fashion']}
        selectedCategories={['fashion']}
        onToggleCategory={vi.fn()}
        onRatingChange={vi.fn()}
        onToggleInStock={vi.fn()}
        onToggleDiscount={vi.fn()}
        onClearFilters={vi.fn()}
      />,
      { locale: 'en' },
    );

    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByText('Rating & Availability')).toBeInTheDocument();
    expect(screen.getByText('In stock only')).toBeInTheDocument();
    expect(screen.getByText('On sale only')).toBeInTheDocument();
    expect(screen.getAllByText(/& up$/)).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('pagination labels its controls in English', () => {
    renderWithIntl(<Pagination currentPage={2} totalPages={3} onPageChange={vi.fn()} />, {
      locale: 'en',
    });

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveTextContent('Previous');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveTextContent('Next');
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
  });
});

describe('empty-state presets with a translator', () => {
  const t = createTranslator({ locale: 'en', messages: enMessages, namespace: 'common.empty' });

  it('builds English presets from the common.empty catalog', () => {
    expect(emptyCart(t)).toEqual({
      title: 'Your shopping cart is empty',
      description: 'Start adding products to your cart to continue to checkout.',
      cta: { label: 'Shop now', href: '/products' },
    });
    expect(emptySearchResults('chair', t).description).toBe(
      'We could not find any products for "chair". Try another keyword or remove some filters.',
    );
    expect(emptyCategoryProducts(['Fashion', 'Home'], t).description).toBe(
      'The Fashion, Home category has no products yet. Try another category to find similar products.',
    );
    expect(emptyCategoryProducts([], t).description).toBe(
      'This category has no products yet. Try another category to find similar products.',
    );
  });

  it('keeps the Indonesian preset text identical to the pre-migration strings', () => {
    const id = createTranslator({ locale: 'id', messages: idMessages, namespace: 'common.empty' });

    expect(emptyCart(id)).toEqual({
      title: 'Keranjang belanja kosong',
      description: 'Mulai tambahkan produk ke keranjang Anda untuk melanjutkan ke proses checkout.',
      cta: { label: 'Belanja sekarang', href: '/products' },
    });
    expect(emptySearchResults('kursi', id).description).toBe(
      'Kami tidak menemukan produk untuk "kursi". Coba kata kunci lain atau hapus beberapa filter.',
    );
    expect(emptyCategoryProducts(['Fashion', 'Home'], id).description).toBe(
      'Kategori Fashion, Home belum memiliki produk. Coba lihat kategori lain untuk menemukan produk serupa.',
    );
    expect(emptyCategoryProducts(undefined, id).description).toBe(
      'Kategori ini belum memiliki produk. Coba lihat kategori lain untuk menemukan produk serupa.',
    );
  });
});
