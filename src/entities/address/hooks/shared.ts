import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useReducer, useRef } from 'react';

import { getAddressListKey } from '../keys';
import type { AddressInput, AddressUpdateInput } from '../schemas';
import { getGuestAddressOwnerId, writeGuestAddresses } from '../storage';
import type { Address } from '../types';

export type CreateAddressVariables = AddressInput & {
  clientRequestId: string;
};

export type AddressHookContextSource = 'account' | 'checkout';

export type AddressHookOptions = {
  context?: AddressHookContextSource;
};

export type MutationBaseContext = {
  startTime: number;
  usedByCheckout: boolean;
};

export type CreateAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  tempId: string;
  shouldBeDefault: boolean;
};

export type UpdateAddressVariables = {
  id: string;
  input: AddressUpdateInput;
};

export type UpdateAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

export type DeleteAddressContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

export type SetDefaultContext = MutationBaseContext & {
  previousAddresses?: Address[];
  targetId: string;
  snapshot?: Address;
};

export function shouldUseGuestStorage(userIdOrGuestId?: string | null) {
  return !userIdOrGuestId;
}

export function resolveOwnerId(userIdOrGuestId?: string | null) {
  if (userIdOrGuestId) {
    return userIdOrGuestId;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return getGuestAddressOwnerId();
}

export function generateAddressId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useInFlightRegistry() {
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

export function readAddressCache(queryClient: QueryClient, ownerId?: string | null) {
  return queryClient.getQueryData<Address[]>(getAddressListKey(ownerId ?? null)) ?? [];
}

export function writeAddressCache(
  queryClient: QueryClient,
  ownerId: string | null | undefined,
  addresses: Address[],
) {
  queryClient.setQueryData(getAddressListKey(ownerId ?? null), addresses);
}

export function commitAddressState(
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

export async function cancelAddressQueries(queryClient: QueryClient, ownerId?: string | null) {
  await queryClient.cancelQueries({ queryKey: getAddressListKey(ownerId ?? null) });
}

export function invalidateAddressQueries(queryClient: QueryClient, ownerId?: string | null) {
  void queryClient.invalidateQueries({ queryKey: getAddressListKey(ownerId ?? null) });
}

export function mergeAddressPatch(target: Address, patch: AddressUpdateInput): Address {
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
