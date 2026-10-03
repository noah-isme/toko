import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { updateAddress } from '../api';
import { getAddressKey } from '../keys';
import { readGuestAddresses, setGuestDefaultId, upsertGuestAddress } from '../storage';
import type { Address } from '../types';

import {
  type AddressHookOptions,
  type UpdateAddressContext,
  type UpdateAddressVariables,
  cancelAddressQueries,
  commitAddressState,
  invalidateAddressQueries,
  mergeAddressPatch,
  readAddressCache,
  resolveOwnerId,
  shouldUseGuestStorage,
  useInFlightRegistry,
} from './shared';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export function useUpdateAddressMutation(
  userIdOrGuestId: string | null | undefined,
  options: AddressHookOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ownerId = resolveOwnerId(userIdOrGuestId);
  const useGuestStorage = shouldUseGuestStorage(userIdOrGuestId);
  const usageContext = options.context ?? 'account';
  const usedByCheckout = usageContext === 'checkout';
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<Address, Error, UpdateAddressVariables, UpdateAddressContext>({
    mutationFn: async ({ id, input }) => {
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_update_request',
        data: { addressId: id, context: usageContext },
        level: 'info',
      });

      if (useGuestStorage) {
        const current = readGuestAddresses();
        const target = current.find((address) => address.id === id);
        if (!target) {
          throw new Error('Alamat tidak ditemukan');
        }

        const updated = mergeAddressPatch(target, input);
        upsertGuestAddress(updated);
        if (updated.isDefault) {
          setGuestDefaultId(updated.id);
        } else if (
          typeof input.isDefault === 'boolean' &&
          !input.isDefault &&
          !current.some((address) => address.id !== id && address.isDefault)
        ) {
          setGuestDefaultId(current[0]?.id ?? null);
        }

        return updated;
      }

      return updateAddress(id, input);
    },
    onMutate: async ({ id, input }) => {
      const startTime = performance.now();
      await cancelAddressQueries(queryClient, ownerId);

      const previousAddresses = useGuestStorage
        ? readGuestAddresses()
        : readAddressCache(queryClient, ownerId);
      const targetIndex = previousAddresses.findIndex((item) => item.id === id);
      if (targetIndex === -1) {
        return { previousAddresses, targetId: id, startTime, usedByCheckout };
      }

      const optimistics = [...previousAddresses];
      const snapshot = optimistics[targetIndex];
      optimistics[targetIndex] = mergeAddressPatch(snapshot, input);

      if (typeof input.isDefault === 'boolean') {
        if (input.isDefault) {
          for (let index = 0; index < optimistics.length; index += 1) {
            optimistics[index] = {
              ...optimistics[index],
              isDefault: optimistics[index].id === id,
            };
          }
          if (useGuestStorage) {
            setGuestDefaultId(id);
          }
        } else if (optimistics[targetIndex].isDefault && useGuestStorage) {
          setGuestDefaultId(
            optimistics.find((address) => address.id !== id && address.isDefault)?.id ?? null,
          );
        }
      }

      commitAddressState(queryClient, ownerId, optimistics, useGuestStorage);

      return { previousAddresses, targetId: id, snapshot, startTime, usedByCheckout };
    },
    onSuccess: (data, _variables, context) => {
      const current = readAddressCache(queryClient, ownerId);
      const index = current.findIndex((item) => item.id === data.id);
      if (index === -1) {
        commitAddressState(queryClient, ownerId, current, useGuestStorage);
        return;
      }

      const next = [...current];
      next[index] = data;
      commitAddressState(queryClient, ownerId, next, useGuestStorage);
      queryClient.setQueryData(getAddressKey(data.id), data);

      if (useGuestStorage) {
        if (data.isDefault) {
          setGuestDefaultId(data.id);
        } else if (!next.some((address) => address.isDefault)) {
          setGuestDefaultId(next[0]?.id ?? null);
        }
      }

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('address_update', {
        addressId: data.id,
        isDefault: data.isDefault,
        country: data.country,
        province: data.province,
        totalAddresses: next.length,
        durationMs,
        context: usageContext,
      });
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_update_success',
        data: { addressId: data.id, durationMs, context: usageContext },
        level: 'info',
      });

      toast({
        id: `address-update-${data.id}`,
        title: 'Alamat diperbarui',
        variant: 'success',
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousAddresses) {
        commitAddressState(queryClient, ownerId, context.previousAddresses, useGuestStorage);
        if (useGuestStorage) {
          const defaultId =
            context.previousAddresses.find((address) => address.isDefault)?.id ?? null;
          setGuestDefaultId(defaultId);
        }
      }

      captureSentryException(error, {
        tags: { action: 'address_update', context: usageContext },
        extra: {
          id: context?.targetId,
          isDefault: context?.snapshot?.isDefault ?? false,
          usedByCheckout: context?.usedByCheckout ?? false,
          durationMs: context ? performance.now() - context.startTime : undefined,
        },
      });

      toast({
        id: `address-update-error-${context?.targetId ?? 'unknown'}`,
        title: 'Gagal memperbarui alamat',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      invalidateAddressQueries(queryClient, ownerId);
    },
  });

  const guardedMutate = useCallback<typeof mutation.mutate>(
    (variables, mutateOptions) => {
      const guardKey = `update:${variables.id}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(variables, {
        ...mutateOptions,
        onSettled: (data, error, vars, context, mutationContext) => {
          remove(guardKey);
          mutateOptions?.onSettled?.(data, error, vars, context, mutationContext);
        },
      });
    },
    [add, mutation, remove],
  );

  const guardedMutateAsync = useCallback<typeof mutation.mutateAsync>(
    async (variables, mutateOptions) => {
      const guardKey = `update:${variables.id}`;
      if (!add(guardKey)) {
        throw new Error('Update already in progress for this address');
      }

      try {
        return await mutation.mutateAsync(variables, mutateOptions);
      } finally {
        remove(guardKey);
      }
    },
    [add, mutation, remove],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate: guardedMutate,
      mutateAsync: guardedMutateAsync,
      isGuardActive: (id: string) => has(`update:${id}`),
    }),
    [guardedMutate, guardedMutateAsync, has, mutation],
  );
}
