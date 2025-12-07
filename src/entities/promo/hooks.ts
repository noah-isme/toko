import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import { applyPromo, removePromo, validatePromo } from './api';
import { getPromoKey, getPromoValidateKey } from './keys';
import type { PromoResult } from './schemas';

import {
  cloneCartWithMeta,
  getCartQueryKey,
  readCartCache,
  updateCartCache,
  writeCartCache,
  type CartWithPromo,
} from '@/entities/cart/cache';
import type { Cart } from '@/lib/api/schemas';
import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

function useInFlightRegistry() {
  const registryRef = useRef(new Set<string>());
  const [, forceRender] = useReducer((count) => count + 1, 0);

  const add = useCallback((key: string) => {
    if (registryRef.current.has(key)) {
      return false;
    }

    registryRef.current.add(key);
    forceRender();
    return true;
  }, []);

  const remove = useCallback((key: string) => {
    if (registryRef.current.delete(key)) {
      forceRender();
    }
  }, []);

  const has = useCallback((key: string) => registryRef.current.has(key), []);

  return { add, remove, has };
}

function getDiscountValue(subtotal: number, result?: PromoResult) {
  if (!result?.promo || !result.valid) {
    return 0;
  }

  const appliedSubtotal =
    typeof result.appliedSubtotal === 'number' ? result.appliedSubtotal : subtotal;
  return Math.max(0, subtotal - appliedSubtotal);
}

function mergePromoResultIntoCart(cart: CartWithPromo, result?: PromoResult) {
  if (!result || !result.valid || !result.promo) {
    delete cart.promoInfo;
    cart.totals = {
      ...cart.totals,
      subtotal: cart.subtotal.amount,
      discount: 0,
      total: cart.totals?.total ?? cart.subtotal.amount,
    };
    return cart;
  }

  const subtotal = cart.subtotal.amount;
  const discountValue = getDiscountValue(subtotal, result);
  const appliedSubtotal =
    typeof result.appliedSubtotal === 'number'
      ? result.appliedSubtotal
      : Math.max(0, subtotal - discountValue);
  const finalTotal =
    typeof result.finalTotal === 'number' ? result.finalTotal : Math.max(0, appliedSubtotal);

  cart.promoInfo = {
    ...result.promo,
    discountValue,
    message: result.message,
  };

  cart.totals = {
    ...cart.totals,
    subtotal: appliedSubtotal,
    discount: discountValue,
    total: finalTotal,
  };

  return cart;
}

function commitPromoResultToCart(
  queryClient: ReturnType<typeof useQueryClient>,
  cartId: string,
  result?: PromoResult,
) {
  return updateCartCache(queryClient, cartId, (draft) => mergePromoResultIntoCart(draft, result));
}

export function useValidatePromoQuery(cartId?: string | null, code?: string | null) {
  return useQuery<PromoResult>({
    queryKey: getPromoValidateKey(cartId ?? null, code ?? null),
    queryFn: () => {
      if (!cartId) {
        throw new Error('Keranjang tidak ditemukan untuk kode promo');
      }
      if (!code) {
        throw new Error('Kode promo wajib diisi');
      }
      return validatePromo(cartId, code);
    },
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });
}

type ApplyPromoVariables = {
  code: string;
  preview: PromoResult;
};

type ApplyPromoContext = {
  previousCart?: Cart;
  previousPromoResult?: PromoResult;
  startTime: number;
};

type RemovePromoContext = {
  previousCart?: Cart;
  previousPromoResult?: PromoResult;
  startTime: number;
};

export function useApplyPromoMutation(cartId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<PromoResult, Error, ApplyPromoVariables, ApplyPromoContext>({
    mutationFn: async ({ code }) => {
      if (!cartId) {
        throw new Error('cartId is required to apply a promo');
      }

      const sentry = getSentry();
      sentry?.addBreadcrumb?.({
        category: 'promo',
        message: 'promo_apply',
        level: 'info',
        data: { cartId, code },
      });

      return applyPromo(cartId, code);
    },
    onMutate: async (variables) => {
      if (!cartId) {
        throw new Error('cartId is required to apply a promo');
      }
      if (!variables.preview?.valid || !variables.preview.promo) {
        throw new Error('Promo perlu divalidasi sebelum diterapkan');
      }

      const startTime = performance.now();
      const cartKey = getCartQueryKey(cartId);
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previousCart = readCartCache(queryClient, cartId);
      const previousPromoResult = queryClient.getQueryData<PromoResult>(getPromoKey(cartId));

      if (variables.preview) {
        queryClient.setQueryData(getPromoKey(cartId), variables.preview);
      }

      if (previousCart && variables.preview?.promo) {
        const optimistic = mergePromoResultIntoCart(
          cloneCartWithMeta(previousCart),
          variables.preview,
        );
        writeCartCache(queryClient, cartId, optimistic);
      }

      return { previousCart, previousPromoResult, startTime } satisfies ApplyPromoContext;
    },
    onSuccess: (data, variables, context) => {
      if (!cartId) {
        return;
      }

      queryClient.setQueryData(getPromoKey(cartId), data);
      commitPromoResultToCart(queryClient, cartId, data);

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('promo_apply', {
        cartId,
        code: variables.code,
        result: 'success',
        cartValueBefore: context?.previousCart?.subtotal.amount,
        discountValue: getDiscountValue(context?.previousCart?.subtotal.amount ?? 0, data),
        discountType: data.promo?.discountType,
        durationMs,
      });

      toast({
        id: `promo-apply-${cartId}`,
        variant: 'success',
        title: 'Kode promo diterapkan',
        description: data.promo?.label ?? `Kode ${variables.code.toUpperCase()} aktif`,
      });
    },
    onError: (error, variables, context) => {
      if (cartId) {
        writeCartCache(queryClient, cartId, context?.previousCart);
        queryClient.setQueryData(getPromoKey(cartId), context?.previousPromoResult);
      }

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('promo_apply', {
        cartId,
        code: variables.code,
        result: 'error',
        durationMs,
      });

      captureSentryException(error, {
        tags: { feature: 'promo', action: 'apply' },
        extra: { cartId, code: variables.code, durationMs },
      });

      toast({
        id: `promo-apply-${cartId}-error`,
        title: 'Gagal menerapkan kode promo',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      if (!cartId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: getCartQueryKey(cartId) });
      void queryClient.invalidateQueries({ queryKey: getPromoKey(cartId) });
    },
  });

  const mutate = useCallback(
    (variables: ApplyPromoVariables, options?: Parameters<typeof mutation.mutate>[1]) => {
      if (!cartId) {
        return;
      }

      const guardKey = `promo:apply:${cartId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(variables, {
        ...options,
        onSettled: (data, error, vars, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, vars, context, mutationContext);
        },
      });
    },
    [add, cartId, mutation, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isCartInFlight: () => (cartId ? has(`promo:apply:${cartId}`) : false),
    }),
    [cartId, has, mutate, mutation],
  );
}

export function useRemovePromoMutation(cartId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<PromoResult, Error, void, RemovePromoContext>({
    mutationFn: async () => {
      if (!cartId) {
        throw new Error('cartId is required to remove promo');
      }

      const sentry = getSentry();
      sentry?.addBreadcrumb?.({
        category: 'promo',
        message: 'promo_remove',
        level: 'info',
        data: { cartId },
      });

      return removePromo(cartId);
    },
    onMutate: async () => {
      if (!cartId) {
        throw new Error('cartId is required to remove promo');
      }

      const startTime = performance.now();
      const cartKey = getCartQueryKey(cartId);
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previousCart = readCartCache(queryClient, cartId);
      const previousPromoResult = queryClient.getQueryData<PromoResult>(getPromoKey(cartId));

      if (previousCart) {
        const cleared = mergePromoResultIntoCart(cloneCartWithMeta(previousCart), undefined);
        writeCartCache(queryClient, cartId, cleared);
      }

      queryClient.setQueryData(getPromoKey(cartId), undefined);

      return { previousCart, previousPromoResult, startTime } satisfies RemovePromoContext;
    },
    onSuccess: (data, _variables, context) => {
      if (!cartId) {
        return;
      }

      queryClient.setQueryData(getPromoKey(cartId), data?.valid ? data : undefined);
      commitPromoResultToCart(queryClient, cartId, data?.valid ? data : undefined);

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('promo_remove', {
        cartId,
        result: 'success',
        durationMs,
      });

      toast({
        id: `promo-remove-${cartId}`,
        title: 'Kode promo dihapus',
        variant: 'default',
      });
    },
    onError: (error, _vars, context) => {
      if (cartId) {
        writeCartCache(queryClient, cartId, context?.previousCart);
        queryClient.setQueryData(getPromoKey(cartId), context?.previousPromoResult);
      }

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('promo_remove', {
        cartId,
        result: 'error',
        durationMs,
      });

      captureSentryException(error, {
        tags: { feature: 'promo', action: 'remove' },
        extra: { cartId, durationMs },
      });

      toast({
        id: `promo-remove-${cartId}-error`,
        title: 'Gagal menghapus kode promo',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      if (!cartId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: getCartQueryKey(cartId) });
      void queryClient.invalidateQueries({ queryKey: getPromoKey(cartId) });
    },
  });

  const mutate = useCallback(
    (options?: Parameters<typeof mutation.mutate>[1]) => {
      if (!cartId) {
        return;
      }

      const guardKey = `promo:remove:${cartId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(undefined, {
        ...options,
        onSettled: (data, error, vars, context, mutationContext) => {
          remove(guardKey);
          options?.onSettled?.(data, error, vars, context, mutationContext);
        },
      });
    },
    [add, cartId, mutation, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isCartInFlight: () => (cartId ? has(`promo:remove:${cartId}`) : false),
    }),
    [cartId, has, mutate, mutation],
  );
}
