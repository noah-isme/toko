import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import { getCartQueryKey, patchCartItems, readCartCache, writeCartCache } from './cache';

import { apiClient } from '@/lib/api/apiClient';
import { queryKeys } from '@/lib/api/queryKeys';
import {
  addToCartInputSchema,
  cartSchema,
  updateCartItemInputSchema,
  type Cart,
  type CartItem,
} from '@/lib/api/schemas';
import { normalizeError } from '@/shared/lib/normalizeError';
import { useToast } from '@/shared/ui/toast';

const DEFAULT_MAX_QUANTITY = 99;

type AddCartItemVariables = {
  productId: string;
  quantity: number;
  name: string;
  price: CartItem['price'];
  image?: string | null;
  maxQuantity?: number;
  cartId?: string;
};

type UpdateCartItemVariables = {
  itemId: string;
  quantity: number;
  maxQuantity?: number;
  cartId?: string;
};

type RemoveCartItemVariables = {
  itemId: string;
  cartId?: string;
};

type MutationContext = { previousCart?: Cart };

type GuardKeyFactory<TVariables> = (variables: TVariables) => string | null | undefined;

type MutationWithGuard<TData, TError, TVariables, TContext> = ReturnType<
  typeof useMutation<TData, TError, TVariables, TContext>
> & {
  mutate: ReturnType<typeof useMutation<TData, TError, TVariables, TContext>>['mutate'];
  mutateAsync: ReturnType<typeof useMutation<TData, TError, TVariables, TContext>>['mutateAsync'];
  isGuardActive: (key: string) => boolean;
};

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

function useGuardedMutation<TData, TError, TVariables, TContext>(
  guardKeyFactory: GuardKeyFactory<TVariables>,
  options: Parameters<typeof useMutation<TData, TError, TVariables, TContext>>[0],
): MutationWithGuard<TData, TError, TVariables, TContext> {
  const { add, remove, has } = useInFlightRegistry();
  const mutation = useMutation<TData, TError, TVariables, TContext>(options);

  const mutate = useCallback<MutationWithGuard<TData, TError, TVariables, TContext>['mutate']>(
    (variables, mutateOptions) => {
      const guardKey = guardKeyFactory(variables);
      if (guardKey && !add(guardKey)) {
        return;
      }

      mutation.mutate(variables, {
        ...mutateOptions,
        onSettled: (data, error, vars, context, mutationContext) => {
          if (guardKey) {
            remove(guardKey);
          }
          mutateOptions?.onSettled?.(data, error, vars, context, mutationContext);
        },
      });
    },
    [add, guardKeyFactory, mutation, remove],
  );

  const mutateAsync = useCallback<
    MutationWithGuard<TData, TError, TVariables, TContext>['mutateAsync']
  >(
    async (variables, mutateOptions) => {
      const guardKey = guardKeyFactory(variables);
      if (guardKey && !add(guardKey)) {
        return undefined as Awaited<ReturnType<typeof mutation.mutateAsync>>;
      }

      try {
        return await mutation.mutateAsync(variables, mutateOptions);
      } finally {
        if (guardKey) {
          remove(guardKey);
        }
      }
    },
    [add, guardKeyFactory, mutation, remove],
  );

  const isGuardActive = useCallback((key: string) => has(key), [has]);

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      mutateAsync,
      isGuardActive,
    }),
    [isGuardActive, mutate, mutateAsync, mutation],
  );
}

function clampQuantity(quantity: number, maxQuantity?: number) {
  const upperBound =
    typeof maxQuantity === 'number' ? Math.max(1, maxQuantity) : DEFAULT_MAX_QUANTITY;
  return Math.min(Math.max(quantity, 1), upperBound);
}

function createFallbackCart(
  cartId: string | undefined,
  currency: CartItem['price']['currency'],
): Cart {
  return {
    id: cartId ?? 'optimistic-cart',
    items: [],
    subtotal: { amount: 0, currency },
    itemCount: 0,
  };
}

async function cancelCartQueries(queryClient: QueryClient, cartId?: string) {
  await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
  if (cartId) {
    await queryClient.cancelQueries({ queryKey: getCartQueryKey(cartId) });
  }
}

function invalidateCartQueries(queryClient: QueryClient, cartId?: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
  if (cartId) {
    void queryClient.invalidateQueries({ queryKey: getCartQueryKey(cartId) });
  }
}

export function useCartQuery(cartId?: string) {
  return useQuery<Cart>({
    queryKey: getCartQueryKey(cartId),
    queryFn: () => apiClient('/cart', { schema: cartSchema }),
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useGuardedMutation<Cart, Error, AddCartItemVariables, MutationContext>(
    (variables) => `add:${variables.productId}`,
    {
      mutationFn: async ({ productId, quantity }) =>
        apiClient('/cart/items', {
          method: 'POST',
          body: JSON.stringify(addToCartInputSchema.parse({ productId, quantity })),
          schema: cartSchema,
        }),
      onMutate: async (variables) => {
        const { productId, quantity, name, price, image, maxQuantity, cartId } = variables;
        await cancelCartQueries(queryClient, cartId);

        const previousCart = readCartCache(queryClient, cartId);
        const baseCart = previousCart ?? createFallbackCart(cartId, price.currency);
        const optimisticCart = patchCartItems(baseCart, (items) => {
          const nextItems = [...items];
          const existingIndex = nextItems.findIndex((item) => item.productId === productId);
          const increment = clampQuantity(quantity, maxQuantity);

          if (existingIndex >= 0) {
            const existing = nextItems[existingIndex]!;
            nextItems[existingIndex] = {
              ...existing,
              quantity: clampQuantity(
                existing.quantity + increment,
                maxQuantity ?? existing.maxQuantity,
              ),
              maxQuantity: existing.maxQuantity ?? maxQuantity,
            };
          } else {
            nextItems.push({
              id: `optimistic-${productId}`,
              productId,
              name,
              quantity: increment,
              price,
              image: image ?? null,
              maxQuantity: maxQuantity,
            });
          }

          return nextItems;
        });

        writeCartCache(queryClient, cartId, optimisticCart);

        return { previousCart } satisfies MutationContext;
      },
      onSuccess: (data, variables) => {
        writeCartCache(queryClient, variables.cartId, data);
        toast({
          id: `cart-${variables.productId}-add-success`,
          title: 'Ditambahkan ke keranjang',
          variant: 'success',
        });
      },
      onError: (error, variables, context) => {
        writeCartCache(queryClient, variables.cartId, context?.previousCart);
        toast({
          id: `cart-${variables.productId}-add-error`,
          title: 'Gagal menambahkan ke keranjang',
          description: normalizeError(error),
          variant: 'destructive',
        });
      },
      onSettled: (_data, _error, variables) => {
        invalidateCartQueries(queryClient, variables?.cartId);
      },
    },
  );

  return useMemo(
    () => ({
      ...mutation,
      isProductInFlight: (productId: string) => mutation.isGuardActive(`add:${productId}`),
    }),
    [mutation],
  );
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useGuardedMutation<Cart, Error, UpdateCartItemVariables, MutationContext>(
    (variables) => `update:${variables.itemId}`,
    {
      mutationFn: async ({ itemId, quantity }) =>
        apiClient(`/cart/items/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(updateCartItemInputSchema.parse({ quantity })),
          schema: cartSchema,
        }),
      onMutate: async (variables) => {
        const { itemId, quantity, maxQuantity, cartId } = variables;
        await cancelCartQueries(queryClient, cartId);
        const previousCart = readCartCache(queryClient, cartId);

        if (!previousCart) {
          return { previousCart } satisfies MutationContext;
        }

        const optimisticCart = patchCartItems(previousCart, (items) => {
          return items.map((item) => {
            if (item.id !== itemId) {
              return item;
            }

            const nextQuantity = clampQuantity(quantity, maxQuantity ?? item.maxQuantity);
            return {
              ...item,
              quantity: nextQuantity,
              maxQuantity: item.maxQuantity ?? maxQuantity,
            };
          });
        });

        writeCartCache(queryClient, cartId, optimisticCart);

        return { previousCart } satisfies MutationContext;
      },
      onSuccess: (data, variables) => {
        writeCartCache(queryClient, variables.cartId, data);
        toast({
          id: `cart-${variables.itemId}-update-success`,
          title: 'Jumlah diperbarui',
          variant: 'success',
        });
      },
      onError: (error, variables, context) => {
        writeCartCache(queryClient, variables.cartId, context?.previousCart);
        toast({
          id: `cart-${variables.itemId}-update-error`,
          title: 'Gagal memperbarui jumlah',
          description: normalizeError(error),
          variant: 'destructive',
        });
      },
      onSettled: (_data, _error, variables) => {
        invalidateCartQueries(queryClient, variables?.cartId);
      },
    },
  );

  return useMemo(
    () => ({
      ...mutation,
      isItemInFlight: (itemId: string) => mutation.isGuardActive(`update:${itemId}`),
    }),
    [mutation],
  );
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useGuardedMutation<Cart, Error, RemoveCartItemVariables, MutationContext>(
    (variables) => `remove:${variables.itemId}`,
    {
      mutationFn: async ({ itemId }) =>
        apiClient(`/cart/items/${itemId}`, {
          method: 'DELETE',
          schema: cartSchema,
        }),
      onMutate: async (variables) => {
        const { itemId, cartId } = variables;
        await cancelCartQueries(queryClient, cartId);
        const previousCart = readCartCache(queryClient, cartId);

        if (!previousCart) {
          return { previousCart } satisfies MutationContext;
        }

        const optimisticCart = patchCartItems(previousCart, (items) =>
          items.filter((item) => item.id !== itemId),
        );

        writeCartCache(queryClient, cartId, optimisticCart);

        return { previousCart } satisfies MutationContext;
      },
      onSuccess: (data, variables) => {
        writeCartCache(queryClient, variables.cartId, data);
        toast({
          id: `cart-${variables.itemId}-remove-success`,
          title: 'Item dihapus',
          variant: 'success',
        });
      },
      onError: (error, variables, context) => {
        writeCartCache(queryClient, variables.cartId, context?.previousCart);
        toast({
          id: `cart-${variables.itemId}-remove-error`,
          title: 'Gagal menghapus item',
          description: normalizeError(error),
          variant: 'destructive',
        });
      },
      onSettled: (_data, _error, variables) => {
        invalidateCartQueries(queryClient, variables?.cartId);
      },
    },
  );

  return useMemo(
    () => ({
      ...mutation,
      isItemInFlight: (itemId: string) => mutation.isGuardActive(`remove:${itemId}`),
    }),
    [mutation],
  );
}
