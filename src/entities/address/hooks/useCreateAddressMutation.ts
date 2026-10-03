import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { createAddress } from '../api';
import { getAddressKey } from '../keys';
import { readGuestAddresses, setGuestDefaultId } from '../storage';
import type { Address } from '../types';

import {
  type AddressHookOptions,
  type CreateAddressContext,
  type CreateAddressVariables,
  cancelAddressQueries,
  commitAddressState,
  generateAddressId,
  invalidateAddressQueries,
  readAddressCache,
  resolveOwnerId,
  shouldUseGuestStorage,
} from './shared';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export function useCreateAddressMutation(
  userIdOrGuestId: string | null | undefined,
  options: AddressHookOptions = {},
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ownerId = resolveOwnerId(userIdOrGuestId);
  const useGuestStorage = shouldUseGuestStorage(userIdOrGuestId);
  const usageContext = options.context ?? 'account';
  const usedByCheckout = usageContext === 'checkout';

  const mutation = useMutation<Address, Error, CreateAddressVariables, CreateAddressContext>({
    mutationFn: ({ clientRequestId, ...input }) => {
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_create_request',
        data: { context: usageContext },
        level: 'info',
      });

      if (useGuestStorage) {
        const timestamp = new Date().toISOString();
        return Promise.resolve({
          id: clientRequestId,
          createdAt: timestamp,
          updatedAt: timestamp,
          isDefault: false,
          ...input,
        });
      }

      return createAddress(input);
    },
    onMutate: async ({ clientRequestId, ...input }) => {
      const startTime = performance.now();
      await cancelAddressQueries(queryClient, ownerId);

      const previousAddresses = useGuestStorage
        ? readGuestAddresses()
        : readAddressCache(queryClient, ownerId);
      const timestamp = new Date().toISOString();
      const shouldBeDefault =
        previousAddresses.length === 0 || previousAddresses.every((address) => !address.isDefault);
      const optimistic: Address = {
        id: clientRequestId,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDefault: shouldBeDefault,
        ...input,
      };

      commitAddressState(queryClient, ownerId, [optimistic, ...previousAddresses], useGuestStorage);
      if (useGuestStorage && shouldBeDefault) {
        setGuestDefaultId(clientRequestId);
      }

      return {
        previousAddresses,
        tempId: clientRequestId,
        shouldBeDefault,
        startTime,
        usedByCheckout,
      };
    },
    onSuccess: (data, _variables, context) => {
      const current = readAddressCache(queryClient, ownerId);
      const tempIndex = current.findIndex((item) => item.id === (context?.tempId ?? data.id));
      let nextAddresses: Address[];

      if (tempIndex >= 0) {
        nextAddresses = [...current];
        nextAddresses[tempIndex] = data;
      } else {
        nextAddresses = [data, ...current];
      }

      commitAddressState(queryClient, ownerId, nextAddresses, useGuestStorage);
      queryClient.setQueryData(getAddressKey(data.id), data);

      if (useGuestStorage && data.isDefault) {
        setGuestDefaultId(data.id);
      }

      const durationMs = context ? performance.now() - context.startTime : undefined;
      capturePosthogEvent('address_create', {
        addressId: data.id,
        isDefault: data.isDefault,
        country: data.country,
        province: data.province,
        totalAddresses: nextAddresses.length,
        durationMs,
        context: usageContext,
      });
      getSentry()?.addBreadcrumb?.({
        category: 'address',
        message: 'address_create_success',
        data: { addressId: data.id, durationMs, context: usageContext },
        level: 'info',
      });

      toast({
        id: `address-create-${data.id}`,
        title: 'Alamat ditambahkan',
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
        tags: { action: 'address_create', context: usageContext },
        extra: {
          id: context?.tempId,
          isDefault: context?.shouldBeDefault ?? false,
          usedByCheckout: context?.usedByCheckout ?? false,
          durationMs: context ? performance.now() - context.startTime : undefined,
        },
      });

      toast({
        id: 'address-create-error',
        title: 'Gagal menambah alamat',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      invalidateAddressQueries(queryClient, ownerId);
    },
  });

  const mutate = useCallback<typeof mutation.mutate>(
    (input, options) => {
      const clientRequestId = generateAddressId();
      mutation.mutate({ ...input, clientRequestId }, options);
    },
    [mutation],
  );

  const mutateAsync = useCallback<typeof mutation.mutateAsync>(
    (input, options) => {
      const clientRequestId = generateAddressId();
      return mutation.mutateAsync({ ...input, clientRequestId }, options);
    },
    [mutation],
  );

  return useMemo(
    () => ({
      ...mutation,
      mutate,
      mutateAsync,
    }),
    [mutate, mutateAsync, mutation],
  );
}
