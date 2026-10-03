import { useQuery } from '@tanstack/react-query';

import { listAddresses } from '../api';
import { getAddressListKey } from '../keys';
import { readGuestAddresses } from '../storage';
import type { Address } from '../types';

import { resolveOwnerId, shouldUseGuestStorage } from './shared';

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
