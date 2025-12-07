import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, mockAddressHandlers, withQueryClient } from './utils';

import { useAddressListQuery, useDeleteAddressMutation } from '@/entities/address/hooks';
import type { Address } from '@/entities/address/types';


describe('address delete mutation', () => {
  it('removes address optimistically and restores on failure', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-delete-flow';
    const seed: Address[] = [
      {
        id: 'addr-delete-1',
        fullName: 'Keep User',
        phone: '0811111111',
        line1: 'Jl. Lama',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'addr-delete-2',
        fullName: 'Delete Me',
        phone: '0822222222',
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

    const { result: mutationResult } = renderHook(() => useDeleteAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate('addr-delete-2');
    });

    const optimistic = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(optimistic?.some((addr) => addr.id === 'addr-delete-2')).toBe(false);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });
  });
});
