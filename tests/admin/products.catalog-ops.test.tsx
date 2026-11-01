/**
 * Admin products page against the shared mock resolvers (through MSW): URL
 * filters and sort, row selection, bulk actions with confirmation and per-row
 * errors, and the CSV export download.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import OrdersPage from '@/app/(admin)/admin/orders/page';
import ProductsPage from '@/app/(admin)/admin/products/page';
import { setAccessToken } from '@/lib/api/apiClient';
import { MOCK_ADMIN_TOKEN, adminProducts } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';
import { server } from '@/mocks/server';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/products',
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

const download = vi.hoisted(() => ({ saveBlob: vi.fn() }));
vi.mock('@/lib/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/download')>()),
  saveBlob: download.saveBlob,
}));

function renderPage(ui: React.ReactElement = <ProductsPage />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(ui, { locale: 'en', wrapper });
}

async function rows() {
  return screen.findAllByTestId('admin-product-row');
}

function rowFor(title: string) {
  const row = screen
    .getAllByTestId('admin-product-row')
    .find((element) => within(element).queryByText(title));
  if (!row) throw new Error(`no row for ${title}`);
  return row;
}

beforeEach(() => {
  resetMockState();
  setAccessToken(MOCK_ADMIN_TOKEN);
  nav.search = '';
  nav.replace.mockReset();
  toast.mockReset();
  download.saveBlob.mockReset();
});

afterEach(() => setAccessToken(null));

describe('admin products: filters and sort', () => {
  it('reads stock and status filters from the URL and shows API stock status', async () => {
    nav.search = 'stockStatus=low';
    renderPage();
    const list = await rows();
    expect(list).toHaveLength(3);
    for (const row of list) {
      expect(within(row).getByTestId('stock-status-badge')).toHaveAttribute(
        'data-stock-status',
        'low',
      );
    }
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('syncs column sort to the URL and announces it with aria-sort', async () => {
    nav.search = 'sort=price:asc';
    renderPage();
    await rows();
    const priceHeader = screen.getByRole('columnheader', { name: 'Price' });
    expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Product' })).toHaveAttribute(
      'aria-sort',
      'none',
    );
    await userEvent.click(within(priceHeader).getByRole('button'));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/products?sort=price%3Adesc', {
      scroll: false,
    });
    await userEvent.click(screen.getByTestId('sort-name'));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/products?sort=name%3Aasc', {
      scroll: false,
    });
  });
});

describe('admin products: page state', () => {
  it('lets the header actions wrap so the three buttons fit a phone screen', async () => {
    renderPage();
    await rows();
    const actions = screen.getByTestId('admin-page-actions');
    expect(actions).toHaveClass('flex-wrap');
    expect(within(actions).getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    expect(within(actions).getByRole('link', { name: 'Import CSV' })).toBeInTheDocument();
  });

  it('re-seeds the search box when the URL query changes from outside', async () => {
    nav.search = 'q=abc';
    const view = renderPage();
    const box = screen.getByLabelText('Search products');
    expect(box).toHaveValue('abc');

    // e.g. the Products nav link drops ?q=abc
    nav.search = '';
    view.rerender(<ProductsPage />);
    await waitFor(() => expect(screen.getByLabelText('Search products')).toHaveValue(''));
    // Clearing the box this way must not push the stale value back into the URL.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(nav.replace).not.toHaveBeenCalledWith(
      expect.stringContaining('q=abc'),
      expect.anything(),
    );
  });

  it('steps back to the last page when the current page comes back empty', async () => {
    nav.search = 'page=99';
    renderPage();
    const lastPage = Math.max(1, Math.ceil(adminProducts.length / 20));
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(
        lastPage > 1 ? `/admin/products?page=${lastPage}` : '/admin/products',
        { scroll: false },
      ),
    );
  });
});

describe('admin products: bulk actions', () => {
  it('changes status for the selected products after confirmation', async () => {
    renderPage();
    await rows();
    const [first, second] = adminProducts;
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${first.title}` }));
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${second.title}` }));
    const bar = screen.getByRole('toolbar', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('2 products selected');

    await userEvent.click(within(bar).getByRole('button', { name: 'Change status' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Draft' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    expect(within(dialog).getByTestId('bulk-confirm')).toHaveTextContent(
      'Change 2 products to Draft.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply changes' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '2 items updated', variant: 'success' }),
      ),
    );
    await waitFor(() =>
      expect(within(rowFor(first.title)).getByTestId('product-status-badge')).toHaveAttribute(
        'data-status',
        'draft',
      ),
    );
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('marks rejected products when a stock adjustment would go negative', async () => {
    renderPage();
    await rows();
    const low = adminProducts[7]; // seeded with 2 in stock
    const plenty = adminProducts[0]; // seeded with 20 in stock
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${low.title}` }));
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${plenty.title}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Adjust stock' }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '-5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    expect(within(dialog).getByTestId('bulk-confirm')).toHaveTextContent(
      'Change the stock of 2 variants by -5.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply changes' }));

    const failure = await within(dialog).findByTestId('bulk-failure');
    expect(failure).toHaveTextContent('Nothing was changed');
    expect(failure).toHaveTextContent(`${low.title}: Stock would drop below 0.`);
    // A long rejection list (up to 500 items) must scroll instead of pushing the
    // title and footer off-screen.
    expect(dialog).toHaveClass('max-h-[85vh]', 'overflow-y-auto');
    expect(within(failure).getByTestId('bulk-failure-lines')).toHaveClass(
      'max-h-60',
      'overflow-y-auto',
    );

    // The row errors stay on the table after the dialog closes.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const errors = within(rowFor(low.title)).getByTestId('admin-product-row-errors');
    expect(errors).toHaveTextContent('Stock would drop below 0.');
    expect(within(rowFor(plenty.title)).queryByTestId('admin-product-row-errors')).toBeNull();
    expect(screen.getByRole('checkbox', { name: `Select ${low.title}` })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('validates the price before review and sends applyTo with the bulk price', async () => {
    let sent: unknown;
    server.use(
      http.post('*/admin/products/bulk/price', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { updated: 1, items: [] } });
      }),
    );
    renderPage();
    await rows();
    const product = adminProducts[2];
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${product.title}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Set price' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    expect(within(dialog).getByTestId('bulk-validation')).toHaveTextContent(
      'Enter a price of 0 or more.',
    );
    expect(within(dialog).getByLabelText('New price (Rp)')).toHaveAccessibleDescription(
      'Enter a price of 0 or more.',
    );

    await userEvent.type(within(dialog).getByLabelText('New price (Rp)'), '125000');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Listing price only' }));
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Remove' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    expect(within(dialog).getByTestId('bulk-confirm')).toHaveTextContent(
      'Variant prices stay as they are.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply changes' }));
    await waitFor(() =>
      expect(sent).toEqual({
        items: [{ productId: product.id, price: 125000, applyTo: 'product', compareAt: null }],
      }),
    );
  });

  it('rejects a stock change that would exceed 500 variants before sending it', async () => {
    const product = adminProducts[0];
    let posted = false;
    server.use(
      http.get('*/admin/inventory', () =>
        HttpResponse.json({
          data: Array.from({ length: 501 }, (_, index) => ({
            variantId: `variant-${index}`,
            productId: product.id,
            productTitle: product.title,
            price: 100000,
            stock: 10,
          })),
        }),
      ),
      http.post('*/admin/products/bulk/stock', () => {
        posted = true;
        return HttpResponse.json({ data: { updated: 0, items: [] } });
      }),
    );
    renderPage();
    await rows();
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${product.title}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Adjust stock' }));
    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText('Quantity');
    await userEvent.type(quantity, '3');
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Review changes' })).toBeEnabled(),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    const message =
      'The selected products have 501 variants. One bulk update can change at most 500; select fewer products.';
    expect(within(dialog).getByTestId('bulk-validation')).toHaveTextContent(message);
    expect(quantity).toHaveAttribute('aria-invalid', 'true');
    expect(quantity).toHaveAccessibleDescription(message);
    expect(within(dialog).queryByTestId('bulk-confirm')).toBeNull();
    expect(posted).toBe(false);
  });

  it('offers a retry when the catalog is busy (409 CONFLICT)', async () => {
    let calls = 0;
    server.use(
      http.post('*/admin/products/bulk/status', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'CONFLICT', message: 'busy', details: { retryable: true } } },
              { status: 409 },
            )
          : HttpResponse.json({ data: { updated: 1, items: [] } });
      }),
    );
    renderPage();
    await rows();
    await userEvent.click(
      screen.getByRole('checkbox', { name: `Select ${adminProducts[1].title}` }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Change status' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Review changes' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply changes' }));
    expect(await within(dialog).findByTestId('bulk-failure')).toHaveTextContent(
      'The catalog is busy',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(calls).toBe(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('admin products: CSV export', () => {
  it('downloads the export for the current filters with the server filename', async () => {
    let query = '';
    server.use(
      http.get('*/admin/products/export', ({ request }) => {
        query = new URL(request.url).search;
        return new HttpResponse('﻿sku\r\nA-1\r\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="products-20261025-080000.csv"',
          },
        });
      }),
    );
    nav.search = 'stockStatus=out&status=published';
    renderPage();
    await rows();
    // The accessible name is the visible label (WCAG 2.5.3); the scope is the description.
    const button = screen.getByRole('button', { name: 'Export CSV' });
    expect(button).toHaveAccessibleDescription(
      'Export the products that match the current filters as CSV',
    );
    await userEvent.click(button);
    await waitFor(() => expect(download.saveBlob).toHaveBeenCalledTimes(1));
    expect(download.saveBlob.mock.calls[0][1]).toBe('products-20261025-080000.csv');
    expect(query).toBe('?status=published&stockStatus=out');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Downloaded products-20261025-080000.csv' }),
    );
  });

  it('downloads the orders export through the shared mock resolver', async () => {
    server.use(
      http.get('*/admin/orders', () =>
        HttpResponse.json({ data: [], pagination: { page: 1, perPage: 20, totalItems: 0 } }),
      ),
      http.get('*/admin/orders/stats', () => HttpResponse.json({ data: null })),
    );
    renderPage(<OrdersPage />);
    const button = screen.getByRole('button', { name: 'Export CSV' });
    expect(button).toHaveAccessibleDescription(/export the orders that match the current filters/i);
    await userEvent.click(button);
    await waitFor(() => expect(download.saveBlob).toHaveBeenCalledTimes(1));
    const [blob, filename] = download.saveBlob.mock.calls[0] as [Blob, string];
    expect(filename).toMatch(/^orders-\d{8}-\d{6}\.csv$/);
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
    // The saved file keeps the server's UTF-8 BOM (Excel needs it).
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(bytes));
    expect(text.startsWith('\uFEFForder_number,order_id,status')).toBe(true);
  });
});
