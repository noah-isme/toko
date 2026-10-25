import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrderConfirmationPage from '@/app/(storefront)/order/confirmation/[orderId]/page';
import { ApiClientError } from '@/lib/api/apiClient';

const mockMutateAsync = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'order-1' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/entities/cart/hooks', () => ({
  useAddToCartMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/stores/cart-store', () => ({
  useCartStore: () => ({ cartId: 'cart-1' }),
}));

vi.mock('@/entities/orders/api/hooks', () => ({
  useCancelOrderMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useOrderQuery: () => ({
    data: {
      id: 'order-1',
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
  useToast: () => ({ toast: mockToast }),
}));

describe('OrderConfirmationPage - cancel', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockToast.mockClear();
  });

  const openAndConfirmCancel = () => {
    fireEvent.click(screen.getByRole('button', { name: /batalkan pesanan/i }));
    fireEvent.click(screen.getByRole('button', { name: /konfirmasi batal/i }));
  };

  it('reports a replayed cancel as already submitted and closes the dialog', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      new ApiClientError('request already in progress', 'IDEMPOTENT_REPLAY', 409),
    );
    render(<OrderConfirmationPage />);

    openAndConfirmCancel();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        description: expect.stringMatching(/sudah dikirim/i),
      }),
    );
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /konfirmasi batal/i })).not.toBeInTheDocument(),
    );
  });

  it('shows the failure toast for other cancel errors', async () => {
    mockMutateAsync.mockRejectedValueOnce(new ApiClientError('nope', 'CONFLICT', 409));
    render(<OrderConfirmationPage />);

    openAndConfirmCancel();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.getByRole('button', { name: /konfirmasi batal/i })).toBeInTheDocument();
  });
});
