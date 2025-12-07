import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, mockAddressHandlers, withQueryClient } from './utils';

import { useAddressListQuery, useUpdateAddressMutation } from '@/entities/address/hooks';
import type { Address } from '@/entities/address/types';


describe('address update mutation', () => {
  it('patches the cached address optimistically', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-update-success';
    const seed: Address[] = [
      {
        id: 'addr-update-1',
        fullName: 'Optimistic User',
        phone: '0811111111',
        line1: 'Jl. Lama 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockAddressHandlers(seed);

    const { result: listResult } = renderHook(() => useAddressListQuery(ownerId), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(listResult.current.data?.length).toBe(1);
    });

    const { result: mutationResult } = renderHook(() => useUpdateAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        id: 'addr-update-1',
        input: { city: 'Bandung', province: 'Jawa Barat' },
      });
    });

    const optimistic = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(optimistic?.[0]?.city).toBe('Bandung');
    expect(optimistic?.[0]?.province).toBe('Jawa Barat');

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });
  });

  it('restores previous state if update fails', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-update-error';
    const seed: Address[] = [
      {
        id: 'addr-update-rollback',
        fullName: 'Rollback User',
        phone: '08123456789',
        line1: 'Jl. Tes 5',
        city: 'Surabaya',
        province: 'Jawa Timur',
        postalCode: '60111',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockAddressHandlers(seed);

    const { result: listResult } = renderHook(() => useAddressListQuery(ownerId), {
      wrapper: Wrapper,
    });
    await waitFor(() => {
      expect(listResult.current.data?.length).toBe(1);
    });

    const snapshot = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);

    const { result: mutationResult } = renderHook(() => useUpdateAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    // trigger error by targeting unknown address id
    await act(async () => {
      mutationResult.current.mutate({
        id: 'unknown-id',
        input: { city: 'Medan' },
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const rolledBack = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(rolledBack).toEqual(snapshot);
  });
});
