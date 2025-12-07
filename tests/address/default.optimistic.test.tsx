import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, mockAddressHandlers, withQueryClient } from './utils';

import { useAddressListQuery, useSetDefaultAddressMutation } from '@/entities/address/hooks';
import type { Address } from '@/entities/address/types';


describe('address set default mutation', () => {
  it('marks selected address as default optimistically', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-default';
    const seed: Address[] = [
      {
        id: 'addr-default-1',
        fullName: 'Primary',
        phone: '0800000000',
        line1: 'Jl. Lama',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12120',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'addr-default-2',
        fullName: 'Secondary',
        phone: '0899999999',
        line1: 'Jl. Baru',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        country: 'ID',
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockAddressHandlers(seed);

    const { result: listResult } = renderHook(() => useAddressListQuery(ownerId), {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(listResult.current.data?.length).toBe(2);
    });

    const { result: mutationResult } = renderHook(() => useSetDefaultAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate('addr-default-2');
    });

    const optimistic = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(optimistic?.find((addr) => addr.id === 'addr-default-2')?.isDefault).toBe(true);
    expect(optimistic?.find((addr) => addr.id === 'addr-default-1')?.isDefault).toBe(false);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });
  });
});
