import { renderHook, act } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, beforeEach, it, vi } from 'vitest';

import { createQueryClient, createTestCart, seedCart, withQueryClient } from './utils';

import { validatePromo } from '@/entities/promo/api';
import { useApplyPromoMutation, useRemovePromoMutation } from '@/entities/promo/hooks';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';


const capturePosthogEvent = vi.fn();
const captureSentryException = vi.fn();
const addBreadcrumb = vi.fn();

vi.mock('@/shared/telemetry/posthog', () => ({
  capturePosthogEvent,
}));

vi.mock('@/shared/telemetry/sentry', () => ({
  captureSentryException,
  getSentry: () => ({ addBreadcrumb }),
}));

describe('promo telemetry', () => {
  beforeEach(() => {
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
      http.post(apiPath('/cart/:cartId/promo/apply'), () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useApplyPromoMutation(cart.id), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ code: 'SAVE10', preview });
      }),
    ).rejects.toThrow();

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
