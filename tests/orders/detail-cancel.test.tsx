import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrderDetailPage from '@/app/(storefront)/account/orders/[orderId]/page';
import { ApiClientError } from '@/lib/api/apiClient';

const mockMutateAsync = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'test-order-id' }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/entities/orders/api/hooks', () => ({
  useCancelOrderMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useOrderQuery: (orderId: string) => ({
    data:
      orderId === 'delivered-order'
        ? {
            id: 'delivered-order',
            orderNumber: 'ORD-DELIVERED',
            status: 'delivered',
            createdAt: '2026-06-30T15:30:00Z',
            items: [],
            pricing: { total: 100000, subtotal: 90000, shipping: 10000 },
            shippingAddress: {
              receiverName: 'Alice',
              phone: '081',
              addressLine1: 'Line',
              city: 'City',
              province: 'Prov',
              postalCode: '123',
            },
          }
        : {
            id: 'test-order-id',
            orderNumber: 'ORD-PENDING',
            status: 'pending_payment',
            createdAt: '2026-06-30T15:30:00Z',
            items: [],
            pricing: { total: 100000, subtotal: 90000, shipping: 10000 },
            shippingAddress: {
              receiverName: 'Alice',
              phone: '081',
              addressLine1: 'Line',
              city: 'City',
              province: 'Prov',
              postalCode: '123',
            },
          },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('OrderDetailPage - Order Cancellation Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    mockMutateAsync.mockReset();
    mockToast.mockClear();
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OrderDetailPage />
      </QueryClientProvider>,
    );
  };

  it('renders Batalkan pesanan button when status is pending', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /batalkan pesanan/i })).toBeInTheDocument();
  });

  it('opens CancelOrderModal when clicking Batalkan pesanan button', async () => {
    renderPage();

    const cancelBtn = screen.getByRole('button', { name: /batalkan pesanan/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Batalkan pesanan', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Berubah pikiran')).toBeInTheDocument();
  });

  it('calls cancel mutation and shows toast when cancellation is confirmed', async () => {
    renderPage();

    const cancelBtn = screen.getByRole('button', { name: /batalkan pesanan/i });
    fireEvent.click(cancelBtn);

    const confirmBtn = screen.getByRole('button', { name: /konfirmasi batal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'success',
          title: 'Pesanan dibatalkan',
        }),
      );
    });
  });

  it('reports a replayed cancel as already submitted instead of failed', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new ApiClientError('request already in progress', 'IDEMPOTENT_REPLAY', 409),
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /batalkan pesanan/i }));
    fireEvent.click(screen.getByRole('button', { name: /konfirmasi batal/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        description: 'Pembatalan Anda sudah dikirim. Status pesanan akan segera diperbarui.',
      }),
    );
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    await waitFor(() =>
      expect(screen.queryByText('Batalkan pesanan', { selector: 'h2' })).not.toBeInTheDocument(),
    );
  });

  it('shows the failure toast for other cancel errors', async () => {
    mockMutateAsync.mockRejectedValueOnce(new ApiClientError('nope', 'CONFLICT', 409));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /batalkan pesanan/i }));
    fireEvent.click(screen.getByRole('button', { name: /konfirmasi batal/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: 'Gagal membatalkan pesanan. Silakan coba lagi.',
        }),
      ),
    );
  });
});
