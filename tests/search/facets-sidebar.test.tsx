import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const searchHooksMock = vi.hoisted(() => ({
  useActiveFilterCount: vi.fn(),
  useSaveSearchMutation: vi.fn(),
  useSearchFacetsQuery: vi.fn(),
}));

vi.mock('@/entities/search/hooks', () => searchHooksMock);

import { AdvancedFilterSidebar } from '@/entities/search/ui/AdvancedFilterSidebar';

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
    await user.click(screen.getByLabelText('Fashion'));
    expect(onFiltersChange).toHaveBeenCalledWith({ categories: [] });
  });
});
