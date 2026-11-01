import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../utils/renderWithIntl';

import ReportsPage from '@/app/(admin)/admin/reports/page';
import { setAccessToken } from '@/lib/api/apiClient';
import { MOCK_ADMIN_TOKEN } from '@/mocks/fixtures';
import { resetMockState } from '@/mocks/resolvers/session';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast }) }));

/** The fixture orders are dated December 2025; "today" puts them in the 30-day preset. */
const TODAY = new Date('2025-12-31T12:00:00+07:00');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderWithIntl(<ReportsPage />, { locale: 'en', wrapper });
}

/** Records the query string of every report request. */
function captureReportRequests() {
  const seen: URL[] = [];
  const listener = ({ request }: { request: Request }) => {
    if (request.url.includes('/admin/reports/')) seen.push(new URL(request.url));
  };
  server.events.on('request:start', listener);
  return { seen, stop: () => server.events.removeListener('request:start', listener) };
}

describe('admin reports page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
    setAccessToken(MOCK_ADMIN_TOKEN);
    toast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    setAccessToken(null);
    resetMockState();
  });

  it('shows sales by category for the last 30 days with the tenant timezone', async () => {
    const requests = captureReportRequests();
    renderPage();

    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
    expect(screen.getByText('Days are counted in Asia/Jakarta')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('2025-12-02');
    expect(screen.getByLabelText('To')).toHaveValue('2025-12-31');

    // The inclusive picker end is sent as the exclusive next day.
    const url = requests.seen.find((u) => u.pathname.endsWith('sales-by-category'))!;
    expect(url.searchParams.get('from')).toBe('2025-12-02');
    expect(url.searchParams.get('to')).toBe('2026-01-01');
    requests.stop();
  });

  it('drills from a category into its products', async () => {
    const user = userEvent.setup();
    renderPage();

    const [drill] = await screen.findAllByRole('button', { name: /^View products in / });
    const category = drill.getAttribute('aria-label')!.replace('View products in ', '');
    await user.click(drill);

    expect(screen.getByRole('tab', { name: 'Sales by product' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText(`Showing products in ${category}`)).toBeInTheDocument();
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveTextContent(category);

    await user.click(screen.getByRole('button', { name: 'Show all categories' }));
    expect(screen.queryByText(`Showing products in ${category}`)).not.toBeInTheDocument();
  });

  it('pages through the product report', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(apiPath('/admin/reports/sales-by-product'), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          data: [
            {
              productId: `p-${page}`,
              title: `Product on page ${page}`,
              slug: `product-${page}`,
              categoryId: null,
              categoryName: 'Uncategorized',
              unitsSold: page,
              orders: 1,
              revenue: 1000 * page,
            },
          ],
          pagination: { page, perPage: 20, totalItems: 45 },
          range: { from: '', to: '', timezone: 'Asia/Jakarta' },
        });
      }),
    );
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Sales by product' }));
    expect(await screen.findByText('Product on page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Product on page 2')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('shows the conversion funnel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Conversion' }));
    const funnel = await screen.findByTestId('conversion-funnel');
    expect(within(funnel).getByText('Carts created')).toBeInTheDocument();
    expect(within(funnel).getByText('Checkouts started')).toBeInTheDocument();
    expect(within(funnel).getAllByText(/of the previous step$/)).toHaveLength(2);
    expect(screen.getByText('Checkout rate')).toBeInTheDocument();
    expect(screen.getByText('Checkout outcomes')).toBeInTheDocument();
  });

  it('charts new and returning customers with a keyboard readout and a table view', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Customers' }));
    const chart = await screen.findByTestId('customers-chart');
    // One column per day of the range, including days without orders.
    expect(chart.children).toHaveLength(30);
    expect(screen.getByText('New customers')).toBeInTheDocument();

    act(() => chart.focus());
    const readout = screen.getByTestId('customers-chart-readout');
    expect(readout).toHaveTextContent(/^Dec 31, 2025: /);
    fireEvent.keyDown(chart, { key: 'Home' });
    expect(readout).toHaveTextContent(/^Dec 2, 2025: 0 new, 0 returning, 0 orders/);

    await user.click(screen.getByRole('button', { name: 'Show table' }));
    expect(screen.getByRole('button', { name: 'Hide table' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('columnheader', { name: 'Returning' })).toBeInTheDocument();
  });

  it('flags an invalid range and holds the reports back', async () => {
    renderPage();
    await screen.findByRole('table');
    const requests = captureReportRequests();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-10' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The start date must be on or before the end date.',
    );
    expect(screen.getByLabelText('From')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(requests.seen).toHaveLength(0);
    requests.stop();
  });

  it('shows the empty state for a range without sales', async () => {
    vi.setSystemTime(new Date('2026-10-25T12:00:00+07:00'));
    renderPage();
    expect(await screen.findByTestId('admin-empty')).toHaveTextContent(
      'No category sales in this range.',
    );
  });

  it('shows the error state and recovers on retry', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get(apiPath('/admin/reports/sales-by-category'), () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL', message: 'failed to load report' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          data: {
            from: '2025-12-02T00:00:00+07:00',
            to: '2026-01-01T00:00:00+07:00',
            timezone: 'Asia/Jakarta',
            totalRevenue: 0,
            totalUnits: 0,
            rows: [],
          },
        });
      }),
    );
    renderPage();

    const error = await screen.findByTestId('admin-error');
    expect(error).toHaveTextContent('failed to load report');
    await user.click(within(error).getByTestId('admin-error-retry'));
    expect(await screen.findByTestId('admin-empty')).toBeInTheDocument();
  });

  it('keeps showing the loading state while a report is pending', async () => {
    server.use(
      http.get(apiPath('/admin/reports/sales-by-category'), async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderPage();
    expect(screen.getByTestId('admin-loading')).toHaveTextContent('Loading report...');
  });

  describe('CSV export', () => {
    let saved: { blob: Blob; name: string } | null;

    beforeEach(() => {
      saved = null;
      let lastBlob: Blob | null = null;
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          lastBlob = blob;
          return 'blob:report';
        }),
        revokeObjectURL: vi.fn(),
      });
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        saved = { blob: lastBlob!, name: this.download };
      });
    });

    afterEach(() => vi.restoreAllMocks());

    it('downloads the server file under its Content-Disposition name', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Export Sales by category as CSV' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Downloaded sales-by-category_2025-12-02_2026-01-01.csv',
            variant: 'success',
          }),
        ),
      );
      expect(saved?.name).toBe('sales-by-category_2025-12-02_2026-01-01.csv');
      const bytes = new Uint8Array(await saved!.blob.arrayBuffer());
      // The UTF-8 BOM survives: the bytes are saved untouched.
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      expect(new TextDecoder().decode(bytes)).toMatch(/^category_id,category,category_slug/);
    });

    it('exports the drilled-down category only', async () => {
      const user = userEvent.setup();
      const requests = captureReportRequests();
      renderPage();
      const [drill] = await screen.findAllByRole('button', { name: /^View products in / });
      await user.click(drill);
      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Export Sales by product as CSV' }));
      await waitFor(() => expect(saved).not.toBeNull());
      const csv = requests.seen.find((u) => u.searchParams.get('format') === 'csv')!;
      expect(csv.pathname.endsWith('/admin/reports/sales-by-product')).toBe(true);
      expect(csv.searchParams.get('categoryId')).toBeTruthy();
      expect(csv.searchParams.has('page')).toBe(false);
      requests.stop();
    });

    it('reports a failed export with the API message', async () => {
      const user = userEvent.setup();
      server.use(
        http.get(apiPath('/admin/reports/conversion'), ({ request }) =>
          new URL(request.url).searchParams.get('format') === 'csv'
            ? HttpResponse.json(
                { error: { code: 'BAD_REQUEST', message: 'range must not exceed 366 days' } },
                { status: 400 },
              )
            : undefined,
        ),
      );
      renderPage();
      await user.click(screen.getByRole('tab', { name: 'Conversion' }));
      await screen.findByTestId('conversion-funnel');

      await user.click(screen.getByRole('button', { name: 'Export Conversion as CSV' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Export failed',
            description: 'range must not exceed 366 days',
            variant: 'destructive',
          }),
        ),
      );
      expect(saved).toBeNull();
    });
  });
});
