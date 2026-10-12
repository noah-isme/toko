import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { setDefaultAddress } from '../api';
import { getAddressKey } from '../keys';
import { readGuestAddresses, setGuestDefaultId, writeGuestAddresses } from '../storage';
import type { Address } from '../types';

import {
  type AddressHookOptions,
  type SetDefaultContext,
  cancelAddressQueries,
  commitAddressState,
  invalidateAddressQueries,
  readAddressCache,
  resolveOwnerId,
  shouldUseGuestStorage,
  useInFlightRegistry,
} from './shared';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export function useSetDefaultAddressMutation(
  userIdOrGuestId: string | null | undefined,
  options: AddressHookOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations('checkout.address.toast');
  const ownerId = resolveOwnerId(userIdOrGuestId);
  const useGuestStorage = shouldUseGuestStorage(userIdOrGuestId);
  const usageContext = options.context ?? 'account';
  const usedByCheckout = usageContext === 'checkout';
  const { add, remove, has } = useInFlightRegistry();

  const mutation = useMutation<Address, Error, string, SetDefaultContext>({
    mutationFn: (id) => {
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_set_default_request',
        data: { addressId: id, context: usageContext },
        level: 'info',
      });

      if (useGuestStorage) {
        const addresses = readGuestAddresses();
        const target = addresses.find((address) => address.id === id);
        if (!target) {
          return Promise.reject(new Error(t('notFound')));
        }

        const updatedList = addresses.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }));
        writeGuestAddresses(updatedList);
        setGuestDefaultId(id);
        return Promise.resolve({
          ...target,
          isDefault: true,
          updatedAt: new Date().toISOString(),
        });
      }

      return setDefaultAddress(id);
    },
    onMutate: async (id) => {
      const startTime = performance.now();
      await cancelAddressQueries(queryClient, ownerId);

      const previousAddresses = useGuestStorage
        ? readGuestAddresses()
        : readAddressCache(queryClient, ownerId);
      const snapshot = previousAddresses.find((address) => address.id === id);
      const next = previousAddresses.map((address) => ({
        ...address,
        isDefault: address.id === id,
      }));
      commitAddressState(queryClient, ownerId, next, useGuestStorage);

      if (useGuestStorage) {
        setGuestDefaultId(id);
      }

      return { previousAddresses, targetId: id, snapshot, startTime, usedByCheckout };
    },
    onSuccess: (data, _variables, context) => {
      const current = readAddressCache(queryClient, ownerId);
      const next = current.map((address) =>
        address.id === data.id ? data : { ...address, isDefault: false },
      );

      commitAddressState(queryClient, ownerId, next, useGuestStorage);
      queryClient.setQueryData(getAddressKey(data.id), data);

      if (useGuestStorage) {
        setGuestDefaultId(data.id);
      }

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('address_set_default', {
        addressId: data.id,
        country: data.country,
        province: data.province,
        durationMs,
        context: usageContext,
      });
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_set_default_success',
        data: { addressId: data.id, durationMs, context: usageContext },
        level: 'info',
      });

      toast({
        id: `address-default-${data.id}`,
        title: t('defaultUpdated'),
        variant: 'success',
      });
    },
    onError: (error, _id, context) => {
      if (context?.previousAddresses) {
        commitAddressState(queryClient, ownerId, context.previousAddresses, useGuestStorage);
        if (useGuestStorage) {
          const defaultId =
            context.previousAddresses.find((address) => address.isDefault)?.id ?? null;
          setGuestDefaultId(defaultId);
        }
      }

      captureSentryException(error, {
        tags: { action: 'address_set_default', context: usageContext },
        extra: {
          id: context?.targetId,
          isDefault: true,
          usedByCheckout: context?.usedByCheckout ?? false,
          durationMs: context ? performance.now() - context.startTime : undefined,
        },
      });

      toast({
        id: `address-default-error-${context?.targetId ?? 'unknown'}`,
        title: t('defaultFailed'),
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      invalidateAddressQueries(queryClient, ownerId);
    },
  });

  const guardedMutate = useCallback<typeof mutation.mutate>(
    (id, mutateOptions) => {
      const guardKey = `default:${id}`;
      if (!add(guardKey)) {
        return;
      }

      mutation.mutate(id, {
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
    async (id, mutateOptions) => {
      const guardKey = `default:${id}`;
      if (!add(guardKey)) {
        throw new Error('Set default already in progress for this address');
      }

      try {
        return await mutation.mutateAsync(id, mutateOptions);
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
      isGuardActive: (id: string) => has(`default:${id}`),
    }),
    [guardedMutate, guardedMutateAsync, has, mutation],
  );
}
