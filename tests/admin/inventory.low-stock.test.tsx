/**
 * Low stock: inventory status from the API with a URL-synced filter, the
 * store-wide threshold, the dashboard cards and the product-form override.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import InventoryPage from '@/app/(admin)/admin/inventory/page';
import AdminDashboard from '@/app/(admin)/admin/page';
import {
  ProductForm,
  formValuesToInput,
  productToFormValues,
} from '@/components/admin/product-form';
import { setAccessToken } from '@/lib/api/apiClient';
import { MOCK_ADMIN_TOKEN, adminProducts } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';
import { server } from '@/mocks/server';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/inventory',
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

function renderUi(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(ui, { locale: 'en', wrapper });
}

beforeEach(() => {
  resetMockState();
  setAccessToken(MOCK_ADMIN_TOKEN);
  nav.search = '';
  nav.replace.mockReset();
  toast.mockReset();
});

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

describe('inventory low stock', () => {
  it('filters by the URL stock status and shows the API classification', async () => {
    nav.search = 'stockStatus=low';
    renderUi(<InventoryPage />);
    const rows = await screen.findAllByTestId('inventory-row');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveAttribute('data-stock-status', 'low');
      expect(within(row).getByText('Low at 5 or fewer')).toBeInTheDocument();
    }
    const filter = screen.getByRole('group', { name: 'Stock level' });
    expect(within(filter).getByRole('button', { name: 'Low stock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(filter).getByRole('button', { name: 'Out of stock' }));
    expect(nav.replace).toHaveBeenCalledWith('/admin/inventory?stockStatus=out', {
      scroll: false,
    });
    await userEvent.click(within(filter).getByRole('button', { name: 'All variants' }));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/inventory', { scroll: false });
  });

  it('accepts the lowStock=true alias', async () => {
    nav.search = 'lowStock=true';
    renderUi(<InventoryPage />);
    expect(await screen.findAllByTestId('inventory-row')).toHaveLength(3);
    expect(nav.replace).toHaveBeenCalledWith('/admin/inventory?stockStatus=low', {
      scroll: false,
    });
  });

  it('saves the store threshold, keeping other inventory settings, and reclassifies', async () => {
    let patched: unknown;
    server.use(
      http.get('*/admin/settings', () =>
        HttpResponse.json({ data: { inventory: { lowStockThreshold: 5, note: 'keep' } } }),
      ),
    );
    nav.search = 'stockStatus=low';
    renderUi(<InventoryPage />);
    expect(await screen.findAllByTestId('inventory-row')).toHaveLength(3);
    const input = screen.getByLabelText('Default threshold');
    await waitFor(() => expect(input).toHaveValue('5'));

    await userEvent.clear(input);
    await userEvent.type(input, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Save threshold' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a whole number from 0 to 1,000,000.',
    );

    server.use(
      http.patch('*/admin/settings', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ data: patched });
      }),
      http.get('*/admin/inventory', () =>
        HttpResponse.json({
          data: adminProducts.slice(0, 4).map((p) => ({
            variantId: p.variants[0].id,
            productId: p.id,
            sku: p.variants[0].sku,
            productTitle: p.title,
            price: p.price,
            stock: p.stock,
            stockStatus: 'low',
            lowStockThreshold: 25,
          })),
        }),
      ),
    );
    await userEvent.clear(input);
    await userEvent.type(input, '25');
    await userEvent.click(screen.getByRole('button', { name: 'Save threshold' }));
    await waitFor(() =>
      expect(patched).toEqual({ inventory: { lowStockThreshold: 25, note: 'keep' } }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Low-stock threshold saved' }),
    );
    await waitFor(() => expect(screen.getAllByTestId('inventory-row')).toHaveLength(4));
    expect(screen.getAllByText('Low at 25 or fewer')).toHaveLength(4);
  });
});

describe('dashboard low-stock cards', () => {
  it('shows low and out-of-stock counts linking to the filtered inventory', async () => {
    server.use(
      http.get('*/admin/orders', () =>
        HttpResponse.json({ data: [], pagination: { page: 1, perPage: 5, totalItems: 0 } }),
      ),
    );
    renderUi(<AdminDashboard />);
    const low = await screen.findByTestId('dashboard-stock-low');
    expect(low).toHaveAttribute('href', '/admin/inventory?stockStatus=low');
    expect(low).toHaveTextContent('3');
    expect(low).toHaveAccessibleName('Low stock: 3 products. View low-stock inventory');
    const out = screen.getByTestId('dashboard-stock-out');
    expect(out).toHaveAttribute('href', '/admin/inventory?stockStatus=out');
    expect(out).toHaveTextContent('1');
  });
});

describe('product form low-stock threshold and status', () => {
  it('maps status and an empty threshold (store default) to the API input', () => {
    const values = productToFormValues({
      ...adminProducts[0],
      status: 'draft',
      lowStockThreshold: 12,
    });
    expect(values).toMatchObject({ status: 'draft', lowStockThreshold: '12' });
    expect(formValuesToInput(values)).toMatchObject({ status: 'draft', lowStockThreshold: 12 });
    expect(formValuesToInput({ ...values, lowStockThreshold: ' ' })).toMatchObject({
      lowStockThreshold: null,
    });
    expect(productToFormValues(adminProducts[0])).toMatchObject({
      status: 'published',
      lowStockThreshold: '',
    });
  });

  it('rejects an invalid threshold before submitting', async () => {
    // Radix Switch measures itself; jsdom has no ResizeObserver.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    server.use(
      http.get('*/admin/categories', () => HttpResponse.json({ data: [] })),
      http.get('*/admin/brands', () => HttpResponse.json({ data: [] })),
    );
    const onSubmit = vi.fn();
    const onError = vi.fn();
    renderUi(
      <ProductForm
        initialValues={productToFormValues(adminProducts[0])}
        submitLabel="Save"
        saving={false}
        onSubmit={onSubmit}
        onError={onError}
        onCancel={vi.fn()}
      />,
    );
    const threshold = screen.getByLabelText('Low-stock threshold');
    expect(threshold).toHaveAttribute('placeholder', 'Store default');
    await userEvent.type(threshold, '-3');
    expect(threshold).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onError).toHaveBeenCalledWith(
      'Low-stock threshold must be a whole number from 0 to 1,000,000.',
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(threshold);
    await userEvent.type(threshold, '8');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ lowStockThreshold: 8, status: 'published' }),
    );
  });
});
