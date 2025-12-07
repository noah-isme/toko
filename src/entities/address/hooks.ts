import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useRef } from 'react';

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './api';
import { getAddressKey, getAddressListKey } from './keys';
import type { AddressInput, AddressUpdateInput } from './schemas';
import {
  getGuestAddressOwnerId,
  readGuestAddresses,
  removeGuestAddress as removeGuestAddressFromStorage,
  setGuestDefaultId,
  upsertGuestAddress,
  writeGuestAddresses,
} from './storage';
import type { Address } from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException, getSentry } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

type CreateAddressVariables = AddressInput & {
  clientRequestId: string;
};

type AddressHookContextSource = 'account' | 'checkout';

type AddressHookOptions = {
  context?: AddressHookContextSource;
};

type MutationBaseContext = {
  startTime: number;
  usedByCheckout: boolean;
};

type CreateAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  tempId: string;
  shouldBeDefault: boolean;
};

type UpdateAddressVariables = {
  id: string;
  input: AddressUpdateInput;
};

type UpdateAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

type DeleteAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

type SetDefaultContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

const isMockApi = process.env.NEXT_PUBLIC_API_URL === 'mock';

function shouldUseGuestStorage(userIdOrGuestId?: string | null) {
  return isMockApi || !userIdOrGuestId;
}

function resolveOwnerId(userIdOrGuestId?: string | null) {
  if (userIdOrGuestId) {
    return userIdOrGuestId;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return getGuestAddressOwnerId();
}

function generateAddressId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

function readAddressCache(queryClient: QueryClient, ownerId?: string | null) {
  return queryClient.getQueryData<Address[]>(getAddressListKey(ownerId ?? null)) ?? [];
}

function writeAddressCache(
  queryClient: QueryClient,
  ownerId: string | null | undefined,
  addresses: Address[],
) {
  queryClient.setQueryData(getAddressListKey(ownerId ?? null), addresses);
}

function commitAddressState(
  queryClient: QueryClient,
  ownerId: string | null | undefined,
  addresses: Address[],
  syncGuest: boolean,
) {
  writeAddressCache(queryClient, ownerId, addresses);
  if (syncGuest) {
    writeGuestAddresses(addresses);
  }
}

async function cancelAddressQueries(queryClient: QueryClient, ownerId?: string | null) {
  await queryClient.cancelQueries({ queryKey: getAddressListKey(ownerId ?? null) });
}

function invalidateAddressQueries(queryClient: QueryClient, ownerId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: getAddressListKey(ownerId ?? null) });
}

function mergeAddressPatch(target: Address, patch: AddressUpdateInput): Address {
  const next = { ...target };
  (Object.keys(patch) as (keyof AddressUpdateInput)[]).forEach((key) => {
    const value = patch[key];
    if (typeof value !== 'undefined') {
      (next as Record<string, unknown>)[key] = value;
    }
  });

  next.updatedAt = new Date().toISOString();
  return next;
}

export function useAddressListQuery(userIdOrGuestId: string | null | undefined) {
  const ownerId = resolveOwnerId(userIdOrGuestId);
  const useGuestStorage = shouldUseGuestStorage(userIdOrGuestId);

  return useQuery<Address[]>({
    queryKey: getAddressListKey(ownerId ?? null),
    enabled: useGuestStorage ? true : Boolean(ownerId),
    queryFn: () => {
      if (useGuestStorage) {
        return Promise.resolve(readGuestAddresses());
      }
      return listAddresses(userIdOrGuestId ?? null);
    },
    initialData: useGuestStorage ? () => readGuestAddresses() : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

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

export function useDeleteAddressMutation(
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
        title: 'Alamat dihapus',
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
        title: 'Gagal menghapus alamat',
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

export function useSetDefaultAddressMutation(
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
          return Promise.reject(new Error('Alamat tidak ditemukan'));
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
        title: 'Alamat utama diperbarui',
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
        title: 'Gagal mengatur alamat utama',
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
