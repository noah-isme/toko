import { renderHook, act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, beforeEach, it, vi } from 'vitest';

import { createQueryClient, createTestCart, seedCart, withQueryClient } from './utils';

import { validatePromo } from '@/entities/promo/api';
import { useApplyPromoMutation, useRemovePromoMutation } from '@/entities/promo/hooks';
import type { VoucherPreviewResponse, VoucherPreviewRequest } from '@/lib/api/types';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function setupPromoHandlers(cartId: string) {
  return [
    http.post(apiPath('/vouchers/preview'), async ({ request }) => {
      const { code } = (await request.json()) as VoucherPreviewRequest;
      return HttpResponse.json({
        eligible: true,
        discount: 20000,
        eligibleSubtotal: 200000,
        finalTotal: 180000,
        voucher: {
          id: 'voucher-1',
          code,
          kind: 'percent',
          value: 0,
          percentBps: 1000,
          minSpend: 100000,
          usageLimit: 100,
          usedCount: 0,
          perUserLimit: 1,
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z',
          productIds: [],
          categoryIds: [],
          brandIds: [],
          combinable: false,
          priority: 10,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          tenantId: 'tenant-1',
        },
        message: 'Diskon 10% aktif',
      } satisfies VoucherPreviewResponse);
    }),
    http.delete(apiPath(`/carts/${cartId}/voucher`), () => {
      return HttpResponse.json({
        eligible: false,
        discount: 0,
        eligibleSubtotal: 0,
        finalTotal: 0,
        voucher: {
          id: '',
          code: '',
          kind: 'fixed_amount',
          value: 0,
          minSpend: 0,
          usedCount: 0,
          validFrom: '',
          validTo: '',
          productIds: [],
          categoryIds: [],
          brandIds: [],
          combinable: false,
          priority: 0,
          createdAt: '',
          updatedAt: '',
          tenantId: '',
        },
        message: 'Kode promo dihapus',
      } satisfies VoucherPreviewResponse);
    }),
  ];
}

const { capturePosthogEvent, captureSentryException, addBreadcrumb } = vi.hoisted(() => ({
  capturePosthogEvent: vi.fn(),
  captureSentryException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent,
}));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryException,
  getSentry: () => ({ addBreadcrumb }),
}));

describe('promo telemetry', () => {
  beforeEach(() => {
    server.resetHandlers();
    capturePosthogEvent.mockClear();
    captureSentryException.mockClear();
    addBreadcrumb.mockClear();
  });

  it('captures success events on promo apply', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart('cart-telemetry');
    seedCart(queryClient, cart);
    const wrapper = withQueryClient(queryClient);
    const cartTotal = cart.subtotal.amount;
    const items = cart.items.map((item) => ({
      productId: item.productId,
      subtotal: item.price.amount * item.quantity,
    }));
    const preview = await validatePromo(cart.id, 'SAVE10', cartTotal, items);

    server.use(...setupPromoHandlers(cart.id));

    const { result } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ code: 'SAVE10', preview, cartTotal, items });
    });

    expect(capturePosthogEvent).toHaveBeenCalledWith(
      'promo_apply',
      expect.objectContaining({ result: 'success', code: 'SAVE10' }),
    );
    expect(addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'promo_apply' }));
  });

  it('reports telemetry on apply error', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart('cart-telemetry-error');
    seedCart(queryClient, cart);
    const wrapper = withQueryClient(queryClient);
    const cartTotal = cart.subtotal.amount;
    const items = cart.items.map((item) => ({
      productId: item.productId,
      subtotal: item.price.amount * item.quantity,
    }));
    const preview = await validatePromo(cart.id, 'SAVE10', cartTotal, items);

    server.use(
      http.post(apiPath('/vouchers/preview'), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });

    try {
      await act(async () => {
        await result.current.mutateAsync({ code: 'SAVE10', preview, cartTotal, items });
      });
    } catch {
      // Expected to throw
    }

    expect(captureSentryException).toHaveBeenCalled();
    expect(capturePosthogEvent).toHaveBeenCalledWith(
      'promo_apply',
      expect.objectContaining({ result: 'error' }),
    );
  });

  it('emits telemetry when removing promo', async () => {
    const queryClient = createQueryClient();
    const cart = createTestCart('cart-telemetry-remove');
    seedCart(queryClient, cart);
    const wrapper = withQueryClient(queryClient);
    const cartTotal = cart.subtotal.amount;
    const items = cart.items.map((item) => ({
      productId: item.productId,
      subtotal: item.price.amount * item.quantity,
    }));
    const preview = await validatePromo(cart.id, 'SAVE10', cartTotal, items);

    server.use(...setupPromoHandlers(cart.id));

    const { result: applyResult } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });
    await act(async () => {
      await applyResult.current.mutateAsync({ code: 'SAVE10', preview, cartTotal, items });
    });

    const { result: removeResult } = renderHook(() => useRemovePromoMutation(cart.id), { wrapper });
    await act(async () => {
      await removeResult.current.mutateAsync();
    });

    expect(capturePosthogEvent).toHaveBeenCalledWith(
      'promo_remove',
      expect.objectContaining({ result: 'success' }),
    );
  });
});
