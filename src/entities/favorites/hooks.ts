import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import { addFavorite, listFavorites, removeFavorite } from './api';
import { getFavoritesQueryKey } from './keys';
import { getGuestId, readGuestFavorites, writeGuestFavorites } from './storage';
import type { FavoriteItem } from './types';

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

export function useFavoritesQuery(userIdOrGuestId?: string) {
  return useQuery<FavoriteItem[]>({
    queryKey: getFavoritesQueryKey(userIdOrGuestId),
    queryFn: async () => {
      try {
        return await listFavorites();
      } catch (error) {
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

  const mutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (productId: string) => {
      const sentry = getSentry();
      sentry?.addBreadcrumb({
        category: 'favorites',
        message: `Adding favorite: ${productId}`,
        level: 'info',
      });

      try {
        await addFavorite(productId);
      } catch (error) {
        const currentFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
        const exists = currentFavorites.some((item) => item.productId === productId);
        if (!exists) {
          const newFavorites = [
            ...currentFavorites,
            { productId, addedAt: new Date().toISOString() },
          ];
          writeFavoritesCache(queryClient, userIdOrGuestId, newFavorites);
          writeGuestFavorites(newFavorites);
        }
        throw error;
      }
    },
    onMutate: async (productId) => {
      await cancelFavoritesQueries(queryClient, userIdOrGuestId);

      const previousFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
      const exists = previousFavorites.some((item) => item.productId === productId);

      if (!exists) {
        const optimisticFavorites = [
          ...previousFavorites,
          { productId, addedAt: new Date().toISOString() },
        ];
        writeFavoritesCache(queryClient, userIdOrGuestId, optimisticFavorites);
        writeGuestFavorites(optimisticFavorites);
      }

      return { previousFavorites } satisfies MutationContext;
    },
    onSuccess: (_data, productId) => {
      capturePosthogEvent('fav_add', { productId });
      toast({
        id: `fav-${productId}-add-success`,
        title: 'Ditambahkan ke favorit',
        variant: 'success',
      });
    },
    onError: (error, productId, context) => {
      writeFavoritesCache(queryClient, userIdOrGuestId, context?.previousFavorites);
      if (context?.previousFavorites) {
        writeGuestFavorites(context.previousFavorites);
      }

      const message = normalizeError(error);
      if (message.includes('409') || message.toLowerCase().includes('already')) {
        toast({
          id: `fav-${productId}-add-info`,
          title: 'Sudah ada di favorit',
          variant: 'default',
        });
      } else {
        toast({
          id: `fav-${productId}-add-error`,
          title: 'Gagal menambahkan ke favorit',
          description: message,
          variant: 'destructive',
        });
      }
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

  const mutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (productId: string) => {
      const sentry = getSentry();
      sentry?.addBreadcrumb({
        category: 'favorites',
        message: `Removing favorite: ${productId}`,
        level: 'info',
      });

      try {
        await removeFavorite(productId);
      } catch (error) {
        const currentFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
        const newFavorites = currentFavorites.filter((item) => item.productId !== productId);
        writeFavoritesCache(queryClient, userIdOrGuestId, newFavorites);
        writeGuestFavorites(newFavorites);
        throw error;
      }
    },
    onMutate: async (productId) => {
      await cancelFavoritesQueries(queryClient, userIdOrGuestId);

      const previousFavorites = readFavoritesCache(queryClient, userIdOrGuestId) ?? [];
      const optimisticFavorites = previousFavorites.filter((item) => item.productId !== productId);

      writeFavoritesCache(queryClient, userIdOrGuestId, optimisticFavorites);
      writeGuestFavorites(optimisticFavorites);

      return { previousFavorites } satisfies MutationContext;
    },
    onSuccess: (_data, productId) => {
      capturePosthogEvent('fav_remove', { productId });
      toast({
        id: `fav-${productId}-remove-success`,
        title: 'Dihapus dari favorit',
        variant: 'success',
      });
    },
    onError: (error, productId, context) => {
      writeFavoritesCache(queryClient, userIdOrGuestId, context?.previousFavorites);
      if (context?.previousFavorites) {
        writeGuestFavorites(context.previousFavorites);
      }

      const message = normalizeError(error);
      if (message.includes('404') || message.toLowerCase().includes('not found')) {
        toast({
          id: `fav-${productId}-remove-info`,
          title: 'Sudah tidak ada di favorit',
          variant: 'default',
        });
      } else {
        toast({
          id: `fav-${productId}-remove-error`,
          title: 'Gagal menghapus dari favorit',
          description: message,
          variant: 'destructive',
        });
      }
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

export function useIsFavorite(productId: string, userIdOrGuestId?: string): boolean {
  const { data } = useFavoritesQuery(userIdOrGuestId);
  return useMemo(() => {
    if (!data) return false;
    return data.some((item) => item.productId === productId);
  }, [data, productId]);
}
