import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OrderDetailPage from '@/app/(storefront)/account/orders/[orderId]/page';
import { server } from '@/mocks/server';

const state = vi.hoisted(() => ({
  status: 'delivered',
  user: { id: 'user-1' } as { id: string } | null,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'order-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: state.user }),
}));

vi.mock('@/shared/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock('@/entities/orders/api/hooks', () => ({
  useCancelOrderMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useOrderQuery: () => ({
    data: {
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: state.status,
      createdAt: '2026-06-30T15:30:00Z',
      items: [
        {
          id: 'item-1',
          productId: 'p-reviewed',
          productTitle: 'Kaos Reviewed',
          productSlug: 'kaos-reviewed',
          qty: 1,
          unitPrice: 50000,
          subtotal: 50000,
        },
        {
          id: 'item-2',
          productId: 'p-new',
          productTitle: 'Topi Baru',
          productSlug: 'topi-baru',
          qty: 1,
          unitPrice: 40000,
          subtotal: 40000,
        },
      ],
      pricing: { total: 100000, subtotal: 90000, shipping: 10000 },
      shippingAddress: {
        receiverName: 'Alice',
        phone: '081',
        addressLine1: 'Line',
        city: 'City',
        province: 'Prov',
        postalCode: '12345',
      },
    },
    isLoading: false,
    error: null,
  }),
}));

function apiReview(productId: string, userId: string) {
  return {
    id: `review-${productId}-${userId}`,
    product_id: productId,
    user_id: userId,
    rating: 5,
    comment: 'Mantap',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    tenant_id: 'tenant-1',
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderDetailPage />
    </QueryClientProvider>,
  );
}

describe('OrderDetailPage - review prompt', () => {
  beforeEach(() => {
    state.status = 'delivered';
    state.user = { id: 'user-1' };
    server.use(
      http.get('*/products/:productId/reviews', ({ params }) =>
        HttpResponse.json(
          params.productId === 'p-reviewed'
            ? [apiReview('p-reviewed', 'user-1')]
            : [apiReview('p-new', 'someone-else')],
        ),
      ),
    );
  });

  it('links each not-yet-reviewed item of a delivered order to its review form', async () => {
    renderPage();

    const cta = await screen.findByRole('link', { name: /beri ulasan: topi baru/i });
    expect(cta).toHaveAttribute('href', '/products/topi-baru#reviews');

    const reviewedItem = screen.getByText('Kaos Reviewed').closest('li')!;
    await waitFor(() =>
      expect(within(reviewedItem).queryByTestId('order-item-review-cta')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('order-item-review-cta')).toHaveLength(1);
  });

  it('still shows the prompt when the review check fails', async () => {
    server.use(
      http.get('*/products/:productId/reviews', () =>
        HttpResponse.json({ error: { message: 'boom' } }, { status: 500 }),
      ),
    );
    renderPage();

    await waitFor(() => expect(screen.getAllByTestId('order-item-review-cta')).toHaveLength(2));
  });

  it('does not prompt for orders that are not delivered', () => {
    state.status = 'shipped';
    renderPage();

    expect(screen.queryByTestId('order-item-review-cta')).not.toBeInTheDocument();
  });
});
