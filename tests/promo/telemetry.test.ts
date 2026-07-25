import { renderHook, act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, beforeEach, it, vi } from 'vitest';

import { createQueryClient, createTestCart, seedCart, withQueryClient } from './utils';

import { validatePromo } from '@/entities/promo/api';
import { useApplyPromoMutation, useRemovePromoMutation } from '@/entities/promo/hooks';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

function setupPromoHandlers(cartId: string) {
  return [
    http.post(apiPath(`/carts/${cartId}/apply-voucher`), async ({ request }) => {
      const { code } = (await request.json()) as { code: string };
      return HttpResponse.json({
        valid: true,
        promo: { code, discountType: 'percent', value: 10, label: 'Diskon 10%' },
        appliedSubtotal: 180000,
        finalTotal: 180000,
        message: 'Diskon 10% aktif',
      });
    }),
    http.delete(apiPath(`/carts/${cartId}/voucher`), () => {
      return HttpResponse.json({ valid: false, message: 'Kode promo dihapus' });
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
    const preview = await validatePromo(cart.id, 'SAVE10');

    server.use(...setupPromoHandlers(cart.id));

    const { result } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ code: 'SAVE10', preview });
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
    const preview = await validatePromo(cart.id, 'SAVE10');

    server.use(
      http.post(apiPath(`/carts/${cart.id}/apply-voucher`), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });

    try {
      await act(async () => {
        await result.current.mutateAsync({ code: 'SAVE10', preview });
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
    const preview = await validatePromo(cart.id, 'SAVE10');

    server.use(...setupPromoHandlers(cart.id));

    const { result: applyResult } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });
    await act(async () => {
      await applyResult.current.mutateAsync({ code: 'SAVE10', preview });
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
