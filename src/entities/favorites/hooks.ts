import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import { listFavorites, toggleFavorite } from './api';
import { getFavoritesQueryKey } from './keys';
import { getGuestId, readGuestFavorites, writeGuestFavorites } from './storage';
import type { FavoriteItem, ToggleFavoriteResponse } from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

type MutationContext = { previousFavorites?: FavoriteItem[] };

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

function readFavoritesCache(
  queryClient: QueryClient,
  userIdOrGuestId?: string,
): FavoriteItem[] | undefined {
  return queryClient.getQueryData<FavoriteItem[]>(getFavoritesQueryKey(userIdOrGuestId));
}

function writeFavoritesCache(
  queryClient: QueryClient,
  userIdOrGuestId: string | undefined,
  items: FavoriteItem[] | undefined,
): void {
  queryClient.setQueryData(getFavoritesQueryKey(userIdOrGuestId), items);
}

async function cancelFavoritesQueries(queryClient: QueryClient, userIdOrGuestId?: string) {
  await queryClient.cancelQueries({ queryKey: getFavoritesQueryKey(userIdOrGuestId) });
}

function invalidateFavoritesQueries(queryClient: QueryClient, userIdOrGuestId?: string) {
  void queryClient.invalidateQueries({ queryKey: getFavoritesQueryKey(userIdOrGuestId) });
}

export function useFavoritesQuery(userIdOrGuestId?: string, isAuthenticated = false) {
  return useQuery<FavoriteItem[]>({
    queryKey: getFavoritesQueryKey(userIdOrGuestId),
    queryFn: async () => {
      // If not authenticated, return guest favorites from local storage
      if (!isAuthenticated) {
        return readGuestFavorites();
      }

      try {
        return await listFavorites();
      } catch (error) {
        // Fallback to guest favorites on error
        const guestFavorites = readGuestFavorites();
        if (guestFavorites.length > 0) {
          return guestFavorites;
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddFavoriteMutation(userIdOrGuestId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<ToggleFavoriteResponse, Error, string, MutationContext>({
    mutationFn: async (productId: string) => {
      const sentry = getSentry();
      sentry?.addBreadcrumb({
        category: 'favorites',
        message: `Toggling favorite (add): ${productId}`,
        level: 'info',
      });

      return toggleFavorite(productId);
    },
    onMutate: async (productId) => {
      await cancelFavoritesQueries(queryClient, userIdOrGuestId);

      const previousFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
      const exists = previousFavorites.some((item) => item.productId === productId);

      if (!exists) {
        // Optimistic add with placeholder data
        const optimisticItem: FavoriteItem = {
          productId,
          productName: 'Loading...',
          productSlug: productId,
          price: 0,
          imageUrl: '',
          createdAt: new Date().toISOString(),
        };
        const optimisticFavorites = [...previousFavorites, optimisticItem];
        writeFavoritesCache(queryClient, userIdOrGuestId, optimisticFavorites);
      }

      return { previousFavorites } satisfies MutationContext;
    },
    onSuccess: (data, productId) => {
      if (data.favorited) {
        capturePosthogEvent('fav_add', { productId });
        toast({
          id: `fav-${productId}-add-success`,
          title: 'Ditambahkan ke favorit',
          variant: 'success',
        });
      }
    },
    onError: (error, productId, context) => {
      writeFavoritesCache(queryClient, userIdOrGuestId, context?.previousFavorites);

      const message = normalizeError(error);
      toast({
        id: `fav-${productId}-add-error`,
        title: 'Gagal menambahkan ke favorit',
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      invalidateFavoritesQueries(queryClient, userIdOrGuestId);
    },
  });

  const mutate = useCallback(
    (productId: string) => {
      const guardKey = `add:${productId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(productId, {
        onSettled: () => {
          remove(guardKey);
        },
      });
    },
    [add, mutation, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isProductInFlight: (productId: string) => has(`add:${productId}`),
    }),
    [has, mutation, mutate],
  );
}

export function useRemoveFavoriteMutation(userIdOrGuestId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<ToggleFavoriteResponse, Error, string, MutationContext>({
    mutationFn: async (productId: string) => {
      const sentry = getSentry();
      sentry?.addBreadcrumb({
        category: 'favorites',
        message: `Toggling favorite (remove): ${productId}`,
        level: 'info',
      });

      return toggleFavorite(productId);
    },
    onMutate: async (productId) => {
      await cancelFavoritesQueries(queryClient, userIdOrGuestId);

      const previousFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
      const optimisticFavorites = previousFavorites.filter((item) => item.productId !== productId);

      writeFavoritesCache(queryClient, userIdOrGuestId, optimisticFavorites);

      return { previousFavorites } satisfies MutationContext;
    },
    onSuccess: (data, productId) => {
      if (!data.favorited) {
        capturePosthogEvent('fav_remove', { productId });
        toast({
          id: `fav-${productId}-remove-success`,
          title: 'Dihapus dari favorit',
          variant: 'success',
        });
      }
    },
    onError: (error, productId, context) => {
      writeFavoritesCache(queryClient, userIdOrGuestId, context?.previousFavorites);

      const message = normalizeError(error);
      toast({
        id: `fav-${productId}-remove-error`,
        title: 'Gagal menghapus dari favorit',
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      invalidateFavoritesQueries(queryClient, userIdOrGuestId);
    },
  });

  const mutate = useCallback(
    (productId: string) => {
      const guardKey = `remove:${productId}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(productId, {
        onSettled: () => {
          remove(guardKey);
        },
      });
    },
    [add, mutation, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      isProductInFlight: (productId: string) => has(`remove:${productId}`),
    }),
    [has, mutation, mutate],
  );
}

export function useIsFavorite(
  productId: string,
  userIdOrGuestId?: string,
  isAuthenticated = false,
): boolean {
  const { data } = useFavoritesQuery(userIdOrGuestId, isAuthenticated);
  return useMemo(() => {
    if (!data) return false;
    return data.some((item) => item.productId === productId);
  }, [data, productId]);
}
