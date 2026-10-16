import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { deleteAddress } from '../api';
import {
  readGuestAddresses,
  removeGuestAddress as removeGuestAddressFromStorage,
  setGuestDefaultId,
} from '../storage';

import {
  type AddressHookOptions,
  type DeleteAddressContext,
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

export function useDeleteAddressMutation(
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

  const mutation = useMutation<void, Error, string, DeleteAddressContext>({
    mutationFn: (id) => {
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_delete_request',
        data: { addressId: id, context: usageContext },
        level: 'info',
      });

      if (useGuestStorage) {
        removeGuestAddressFromStorage(id);
        return Promise.resolve();
      }

      return deleteAddress(id);
    },
    onMutate: async (id) => {
      const startTime = performance.now();
      await cancelAddressQueries(queryClient, ownerId);

      const previousAddresses = useGuestStorage
        ? readGuestAddresses()
        : readAddressCache(queryClient, ownerId);
      const snapshot = previousAddresses.find((address) => address.id === id);
      const next = previousAddresses.filter((item) => item.id !== id);
      commitAddressState(queryClient, ownerId, next, useGuestStorage);

      if (useGuestStorage && snapshot?.isDefault) {
        setGuestDefaultId(next[0]?.id ?? null);
      }

      return { previousAddresses, targetId: id, snapshot, startTime, usedByCheckout };
    },
    onSuccess: (_data, id, context) => {
      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('address_delete', {
        addressId: id,
        isDefault: context?.snapshot?.isDefault ?? false,
        totalAddresses: context?.previousAddresses
          ? context.previousAddresses.length - 1
          : undefined,
        durationMs,
        context: usageContext,
      });
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_delete_success',
        data: { addressId: id, durationMs, context: usageContext },
        level: 'info',
      });

      toast({
        id: `address-delete-${id}`,
        title: t('deleted'),
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
        tags: { action: 'address_delete', context: usageContext },
        extra: {
          id: context?.targetId,
          isDefault: context?.snapshot?.isDefault ?? false,
          usedByCheckout: context?.usedByCheckout ?? false,
          durationMs: context ? performance.now() - context.startTime : undefined,
        },
      });

      toast({
        id: `address-delete-error-${context?.targetId ?? 'unknown'}`,
        title: t('deleteFailed'),
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
      const guardKey = `delete:${id}`;
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
      const guardKey = `delete:${id}`;
      if (!add(guardKey)) {
        throw new Error('Delete already in progress for this address');
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
      isGuardActive: (id: string) => has(`delete:${id}`),
    }),
    [guardedMutate, guardedMutateAsync, has, mutation],
  );
}
