import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AlertsPage from '@/app/(storefront)/account/alerts/page';
import { products } from '@/mocks/fixtures';
import { mockAlerts, resetMockAlerts } from '@/mocks/handlers.alerts';
import { server } from '@/mocks/server';

const toastMock = vi.fn();
vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: toastMock }) }));

async function findAlertItems() {
  const list = await screen.findByRole('list', { name: 'Pengingat produk' });
  return within(list).getAllByRole('listitem');
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AlertsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetMockAlerts();
  toastMock.mockClear();
});

describe('My alerts', () => {
  it('lists alerts newest first with type, status and product link', async () => {
    renderPage();
    const [first, second] = products;

    const items = await findAlertItems();
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Harga turun')).toBeInTheDocument();
    expect(within(items[0]).getByText('Aktif')).toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: first.title })).toHaveAttribute(
      'href',
      `/products/${first.slug}`,
    );
    expect(within(items[1]).getByText('Stok kembali')).toBeInTheDocument();
    expect(within(items[1]).getByText(/^Terkirim /)).toBeInTheDocument();
    // A fired back-in-stock alert for a product that is sellable again cannot be re-armed (409).
    expect(within(items[1]).getByText('Sudah tersedia lagi')).toBeInTheDocument();
    expect(
      within(items[1]).queryByRole('button', {
        name: new RegExp(`Aktifkan lagi.*${second.title}`),
      }),
    ).toBeNull();
  });

  it('removes an alert', async () => {
    renderPage();
    const [first] = products;

    await userEvent.click(
      await screen.findByRole('button', { name: `Hapus pengingat ${first.title}` }),
    );

    await waitFor(async () => expect(await findAlertItems()).toHaveLength(1));
    expect(mockAlerts.items.some((a) => a.productId === first.id)).toBe(false);
    expect(toastMock).toHaveBeenCalledWith({
      variant: 'success',
      description: 'Pengingat dihapus.',
    });
  });

  it('says the alert is already gone when deleting it answers 404', async () => {
    const [first] = products;
    server.use(
      http.delete('*/alerts/:id', () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'gone' } }, { status: 404 }),
      ),
    );
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: `Hapus pengingat ${first.title}` }),
    );

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        variant: 'destructive',
        description: 'Pengingat ini sudah dihapus.',
      }),
    );
  });

  it('shows a fired alert without a date when notifiedAt is missing', async () => {
    mockAlerts.items[1].notifiedAt = null;
    renderPage();

    const items = await findAlertItems();
    expect(within(items[1]).getByText('Terkirim')).toBeInTheDocument();
    expect(within(items[1]).queryByText(/Invalid|NaN/)).toBeNull();
  });

  it('re-arms a fired price-drop alert', async () => {
    const [first] = products;
    mockAlerts.items[0].status = 'notified';
    mockAlerts.items[0].notifiedAt = '2026-10-22T10:00:00Z';
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: `Aktifkan lagi: ${first.title}` }),
    );

    await waitFor(() => expect(mockAlerts.items[0].status).toBe('active'));
    expect(toastMock).toHaveBeenCalledWith({
      variant: 'success',
      description: 'Pengingat diaktifkan lagi.',
    });
  });

  it('shows an empty state', async () => {
    server.use(
      http.get('*/alerts', () =>
        HttpResponse.json({ data: [], pagination: { page: 1, perPage: 20, totalItems: 0 } }),
      ),
    );
    renderPage();

    expect(await screen.findByText('Belum ada pengingat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jelajahi produk' })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('shows an error with retry', async () => {
    let calls = 0;
    server.use(
      http.get('*/alerts', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
          : HttpResponse.json({ data: [], pagination: { page: 1, perPage: 20, totalItems: 0 } });
      }),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memuat pengingat.');
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Belum ada pengingat')).toBeInTheDocument();
  });

  it('paginates', async () => {
    server.use(
      http.get('*/alerts', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          data: [{ ...alertDto(), id: `a1e70000-0000-4000-8000-00000000010${page}` }],
          pagination: { page, perPage: 20, totalItems: 45 },
        });
      }),
    );
    renderPage();

    expect(await screen.findByText('Halaman 1 dari 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(await screen.findByText('Halaman 2 dari 3')).toBeInTheDocument();
  });
});

function alertDto() {
  const [first] = products;
  return {
    productId: first.id,
    variantId: null,
    type: 'PRICE_DROP',
    priceAtSubscribe: first.price,
    status: 'active',
    notifiedAt: null,
    createdAt: '2026-10-20T09:00:00Z',
    product: {
      title: first.title,
      slug: first.slug,
      thumbnail: null,
      price: first.price,
      inStock: true,
    },
  };
}
