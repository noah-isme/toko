import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const searchHooksMock = vi.hoisted(() => ({
  useActiveFilterCount: vi.fn(),
  useSaveSearchMutation: vi.fn(),
  useSearchFacetsQuery: vi.fn(),
}));

vi.mock('@/entities/search/hooks', () => searchHooksMock);

import { AdvancedFilterSidebar } from '@/entities/search/ui/AdvancedFilterSidebar';
import type { ProductFacets } from '@/lib/api/types';

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

const filters = {
  categories: [],
  brands: [],
  priceRange: [0, 10000000] as [number, number],
};

describe('AdvancedFilterSidebar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    searchHooksMock.useActiveFilterCount.mockReturnValue(0);
    searchHooksMock.useSaveSearchMutation.mockReturnValue({ mutate: vi.fn() });
  });

  it('shows a retryable message when catalog filter values fail to load', async () => {
    const refetch = vi.fn();
    searchHooksMock.useSearchFacetsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch,
    });

    const user = userEvent.setup();
    render(<AdvancedFilterSidebar filters={filters} onFiltersChange={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Filter kategori dan merek belum tersedia. Filter harga tetap dapat digunakan.',
    );

    await user.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('renders supported category and brand values without fake counts', async () => {
    searchHooksMock.useSearchFacetsQuery.mockReturnValue({
      data: [
        {
          name: 'categories',
          label: 'Kategori',
          type: 'category',
          multiSelect: true,
          values: [{ value: 'fashion', label: 'Fashion', count: 0, selected: false }],
        },
        {
          name: 'brands',
          label: 'Merek',
          type: 'brand',
          multiSelect: true,
          values: [{ value: 'acme', label: 'Acme', count: 0, selected: false }],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvancedFilterSidebar filters={filters} onFiltersChange={onFiltersChange} />);

    expect(screen.getByText('Fashion')).toBeVisible();
    expect(screen.getByText('Acme')).toBeVisible();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Fashion'));
    expect(onFiltersChange).toHaveBeenCalledWith({ categories: ['fashion'] });
  });

  it('removes a selected catalog value when the URL uses its display label', async () => {
    searchHooksMock.useSearchFacetsQuery.mockReturnValue({
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
    });

    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedFilterSidebar
        filters={{ ...filters, categories: ['Fashion'] }}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.getByLabelText('Fashion')).toBeChecked();
    await user.click(screen.getByLabelText('Semua kategori'));
    expect(onFiltersChange).toHaveBeenCalledWith({ categories: [] });
  });
});

const serverFacets: ProductFacets = {
  categories: [
    { id: 'c1', name: 'Electronics', slug: 'electronics', count: 7 },
    { id: 'c2', name: 'Fashion', slug: 'fashion', count: 3 },
  ],
  brands: [{ id: 'b1', name: 'Apple', slug: 'apple', count: 4 }],
  price: {
    buckets: [
      { min: 0, max: 50000, count: 0 },
      { min: 50000, max: 100000, count: 2 },
      { min: 10000000, max: null, count: 5 },
    ],
  },
  inStock: { true: 9, false: 1 },
};

function desktop() {
  // The panel is rendered for desktop; the mobile sheet only mounts when opened.
  return screen.getByRole('heading', { name: 'Filter' }).closest('div.sticky') as HTMLElement;
}

describe('AdvancedFilterSidebar with facet counts from the product response', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    searchHooksMock.useActiveFilterCount.mockReturnValue(0);
    searchHooksMock.useSaveSearchMutation.mockReturnValue({ mutate: vi.fn() });
    searchHooksMock.useSearchFacetsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('shows category and brand counts and selects a single value', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedFilterSidebar
        filters={filters}
        onFiltersChange={onFiltersChange}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    // The taxonomy fallback stays disabled when the response carries facets.
    expect(searchHooksMock.useSearchFacetsQuery).toHaveBeenCalledWith(filters, { enabled: false });

    const panel = within(desktop());
    const categories = panel.getByRole('radiogroup', { name: 'Kategori' });
    expect(within(categories).getByLabelText('Semua kategori')).toBeChecked();
    expect(within(categories).getByText('(7)')).toBeVisible();
    expect(within(categories).getByText('(3)')).toBeVisible();
    expect(panel.getByRole('radiogroup', { name: 'Merek' })).toHaveTextContent('Apple(4)');

    await user.click(within(categories).getByLabelText(/Electronics/));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ categories: ['electronics'] });

    await user.click(panel.getByLabelText(/Apple/));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ brands: ['apple'] });
  });

  it('keeps a selected value that is not among the returned facets', () => {
    render(
      <AdvancedFilterSidebar
        filters={{ ...filters, brands: ['sony'] }}
        onFiltersChange={vi.fn()}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    const brands = within(desktop()).getByRole('radiogroup', { name: 'Merek' });
    expect(within(brands).getByLabelText(/sony/)).toBeChecked();
    // Facets list only the top 50, so an unlisted value has an unknown count, not zero.
    expect(within(brands).getByLabelText(/sony/).closest('label')).toHaveTextContent(/^sony$/);
    expect(within(brands).queryByText('(0)')).not.toBeInTheDocument();
  });

  it('lists a URL price range that matches no bucket as a checked option', () => {
    render(
      <AdvancedFilterSidebar
        filters={{ ...filters, priceRange: [500000, 10000000] }}
        onFiltersChange={vi.fn()}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    const price = within(desktop()).getByRole('radiogroup', { name: 'Harga' });
    expect(within(price).getByLabelText('Semua harga')).not.toBeChecked();
    const checked = within(price)
      .getAllByRole('radio')
      .filter((radio) => (radio as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
    expect(checked[0].closest('label')).toHaveTextContent(/500\.000 ke atas/);
  });

  it('lets long price labels wrap instead of truncating them', () => {
    render(
      <AdvancedFilterSidebar
        filters={filters}
        onFiltersChange={vi.fn()}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    const price = within(desktop()).getByRole('radiogroup', { name: 'Harga' });
    const label = within(price).getByText(/50\.000.*100\.000/);
    expect(label).not.toHaveClass('truncate');
    expect(label).toHaveClass('break-words');
  });

  it('offers price buckets with counts and hides empty ones', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedFilterSidebar
        filters={{ ...filters, priceRange: [50000, 99999] }}
        onFiltersChange={onFiltersChange}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    const price = within(desktop()).getByRole('radiogroup', { name: 'Harga' });
    const options = within(price).getAllByRole('radio');
    // "All prices", 50k-100k and 10M+; the empty 0-50k bucket is hidden.
    expect(options).toHaveLength(3);
    const bucket = within(price).getByLabelText(/50\.000.*100\.000/);
    expect(bucket).toBeChecked();
    expect(within(price).getByText('(2)')).toBeVisible();

    await user.click(within(price).getByLabelText(/10\.000\.000 ke atas/));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ priceRange: [10000000, 10000000] });

    await user.click(within(price).getByLabelText('Semua harga'));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ priceRange: undefined });
  });

  it('toggles in-stock only and shows its count', async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedFilterSidebar
        filters={filters}
        onFiltersChange={onFiltersChange}
        facetCounts={{ data: serverFacets, isLoading: false }}
      />,
    );

    const checkbox = within(desktop()).getByRole('checkbox', { name: /Hanya yang tersedia/ });
    expect(checkbox).not.toBeChecked();
    expect(checkbox.closest('label')).toHaveTextContent('(9)');
    await user.click(checkbox);
    expect(onFiltersChange).toHaveBeenLastCalledWith({ inStockOnly: true });
  });

  it('shows a loading state while the first response is pending', () => {
    render(
      <AdvancedFilterSidebar
        filters={filters}
        onFiltersChange={vi.fn()}
        facetCounts={{ data: undefined, isLoading: true }}
      />,
    );

    expect(within(desktop()).getByRole('status')).toBeInTheDocument();
    expect(searchHooksMock.useSearchFacetsQuery).toHaveBeenCalledWith(filters, { enabled: false });
  });

  it('falls back to the taxonomy without counts when the response has no facets', () => {
    searchHooksMock.useSearchFacetsQuery.mockReturnValue({
      data: [
        {
          name: 'categories',
          label: 'Kategori',
          type: 'category',
          values: [{ value: 'fashion', label: 'Fashion', count: 0 }],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <AdvancedFilterSidebar
        filters={filters}
        onFiltersChange={vi.fn()}
        facetCounts={{ data: undefined, isLoading: false }}
      />,
    );

    expect(searchHooksMock.useSearchFacetsQuery).toHaveBeenCalledWith(filters, { enabled: true });
    expect(within(desktop()).getByLabelText('Fashion')).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Hanya yang tersedia/ })).not.toBeInTheDocument();
  });
});
