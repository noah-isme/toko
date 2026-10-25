import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OrderDetailPage from '@/app/(storefront)/account/orders/[orderId]/page';
import OrderConfirmationPage from '@/app/(storefront)/order/confirmation/[orderId]/page';
import { canOfferInvoice, isInvoiceIssuable } from '@/entities/orders/api/invoice';
import { InvoiceDownloadButton } from '@/entities/orders/ui/InvoiceDownloadButton';
import { server } from '@/mocks/server';

const state = vi.hoisted(() => ({ status: 'paid' }));
const toastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'order-1001' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/stores/cart-store', () => ({
  useCartStore: () => ({ cartId: 'cart-1' }),
}));

vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/entities/orders/api/hooks', () => ({
  useCancelOrderMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useOrderQuery: () => ({
    data: {
      id: 'order-1001',
      orderNumber: 'ORD-1001',
      status: state.status,
      currency: 'IDR',
      createdAt: '2026-10-01T08:00:00Z',
      items: [],
      pricing: { subtotal: 90000, discount: 0, tax: 0, shipping: 10000, total: 100000 },
      shippingAddress: {
        receiverName: 'Alice',
        phone: '081',
        addressLine1: 'Jl. Melati 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12120',
        country: 'Indonesia',
      },
    },
    isLoading: false,
    error: null,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

let clickedDownloads: Array<{ href: string; download: string }>;

beforeEach(() => {
  state.status = 'paid';
  toastMock.mockClear();
  clickedDownloads = [];
  localStorage.setItem('accessToken', 'token-abc');
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:invoice'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedDownloads.push({ href: this.href, download: this.download });
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('invoice availability', () => {
  it.each([
    ['paid', true, true],
    ['PACKED', true, true],
    ['shipped', true, true],
    ['out_for_delivery', true, true],
    ['delivered', true, true],
    ['cancelled', false, true],
    ['pending_payment', false, false],
    ['', false, false],
  ])('%s: issuable=%s, offered=%s', (status, issuable, offered) => {
    expect(isInvoiceIssuable(status)).toBe(issuable);
    expect(canOfferInvoice(status)).toBe(offered);
  });
});

describe('InvoiceDownloadButton', () => {
  it('downloads the PDF with the server filename and the bearer token', async () => {
    let authorization: string | null = null;
    server.use(
      http.get('*/orders/:orderId/invoice', ({ request }) => {
        authorization = request.headers.get('Authorization');
        return new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="INV-2026-000042.pdf"',
          },
        });
      }),
    );
    renderWithClient(<InvoiceDownloadButton orderId="order-1001" orderNumber="ORD-1001" />);

    await userEvent.click(screen.getByRole('button', { name: 'Unduh invoice' }));

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0]).toEqual({ href: 'blob:invoice', download: 'INV-2026-000042.pdf' });
    expect(authorization).toBe('Bearer token-abc');
    expect(toastMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Unduh invoice' })).toBeEnabled();
  });

  it('falls back to the order number when the filename is not exposed', async () => {
    server.use(
      http.get('*/orders/:orderId/invoice', () =>
        HttpResponse.arrayBuffer(new Uint8Array([1, 2]).buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );
    renderWithClient(<InvoiceDownloadButton orderId="order-1001" orderNumber="ORD-1001" />);

    await userEvent.click(screen.getByRole('button', { name: 'Unduh invoice' }));

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0].download).toBe('invoice-ORD-1001.pdf');
  });

  it.each([
    [409, 'INVOICE_NOT_AVAILABLE', 'Invoice tersedia setelah pesanan dibayar.'],
    [404, 'NOT_FOUND', 'Pesanan tidak ditemukan.'],
    [500, 'INTERNAL', 'Gagal mengunduh invoice. Silakan coba lagi.'],
  ])('shows an error toast for %i %s', async (status, code, description) => {
    server.use(
      http.get('*/orders/:orderId/invoice', () =>
        HttpResponse.json({ error: { code, message: 'nope' } }, { status }),
      ),
    );
    renderWithClient(<InvoiceDownloadButton orderId="order-1001" orderNumber="ORD-1001" />);

    await userEvent.click(screen.getByRole('button', { name: 'Unduh invoice' }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Invoice tidak dapat diunduh',
          description,
        }),
      ),
    );
    expect(clickedDownloads).toHaveLength(0);
  });

  it('downloads the mock PDF served by the shared resolver', async () => {
    renderWithClient(<InvoiceDownloadButton orderId="order-1001" orderNumber="ORD-1001" />);

    await userEvent.click(screen.getByRole('button', { name: 'Unduh invoice' }));

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0].download).toMatch(/^INV-\d{4}-\d{6}\.pdf$/);
  });
});

describe('order pages offer the PDF invoice', () => {
  it('order detail shows it for a paid order and no longer builds a text file', async () => {
    renderWithClient(<OrderDetailPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Unduh invoice' }));

    await waitFor(() => expect(clickedDownloads).toHaveLength(1));
    expect(clickedDownloads[0].download).toMatch(/\.pdf$/);
  });

  it('order detail hides it while payment is pending', () => {
    state.status = 'pending_payment';
    renderWithClient(<OrderDetailPage />);

    expect(screen.queryByRole('button', { name: 'Unduh invoice' })).not.toBeInTheDocument();
  });

  it('order detail keeps it for cancelled orders, which may hold an earlier invoice', () => {
    state.status = 'cancelled';
    renderWithClient(<OrderDetailPage />);

    expect(screen.getByRole('button', { name: 'Unduh invoice' })).toBeInTheDocument();
  });

  it('confirmation page shows it once the order is paid', () => {
    renderWithClient(<OrderConfirmationPage />);

    expect(screen.getByRole('button', { name: 'Unduh invoice' })).toBeInTheDocument();
  });

  it.each(['pending_payment', 'cancelled'])('confirmation page hides it when %s', (status) => {
    state.status = status;
    renderWithClient(<OrderConfirmationPage />);

    expect(screen.queryByRole('button', { name: 'Unduh invoice' })).not.toBeInTheDocument();
  });
});
