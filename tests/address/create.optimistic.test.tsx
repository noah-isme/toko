import { renderHook, act, waitFor } from '@testing-library/react';
import { HttpResponse, http, delay } from 'msw';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { createQueryClient, mockAddressHandlers, withQueryClient } from './utils';

import { useAddressListQuery, useCreateAddressMutation } from '@/entities/address/hooks';
import type { Address } from '@/entities/address/types';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';


describe('address create mutation', () => {
  it('adds a new address optimistically while awaiting server response', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-create-success';
    const seed: Address[] = [
      {
        id: 'addr-1',
        fullName: 'Existing User',
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
      expect(listResult.current.data?.length).toBeGreaterThan(0);
    });

    const { result: mutationResult } = renderHook(() => useCreateAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        fullName: 'New Address',
        phone: '0899999999',
        line1: 'Jl. Baru 99',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        country: 'ID',
      });
    });

    const optimistic = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(optimistic?.[0]?.fullName).toBe('New Address');
    expect(optimistic?.length).toBe(2);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });
  });

  it('rolls back optimistic state when server returns error', async () => {
    const queryClient = createQueryClient();
    const Wrapper = withQueryClient(queryClient);
    const ownerId = 'user-create-error';
    const seed: Address[] = [
      {
        id: 'addr-rollback',
        fullName: 'Rollback User',
        phone: '0812121212',
        line1: 'Jl. Kenangan 10',
        city: 'Surabaya',
        province: 'Jawa Timur',
        postalCode: '60222',
        country: 'ID',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockAddressHandlers(seed);

    server.use(
      http.post(apiPath('/addresses'), async () => {
        await delay(30);
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      }),
    );

    const { result: listResult } = renderHook(() => useAddressListQuery(ownerId), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(listResult.current.data?.length).toBe(1);
    });

    const initialSnapshot = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);

    const { result: mutationResult } = renderHook(() => useCreateAddressMutation(ownerId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      mutationResult.current.mutate({
        fullName: 'Should Rollback',
        phone: '08123456789',
        line1: 'Jl. Error 1',
        city: 'Yogyakarta',
        province: 'DIY',
        postalCode: '55111',
        country: 'ID',
      });
    });

    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const rolledBack = queryClient.getQueryData<Address[]>(['addresses', 'list', ownerId]);
    expect(rolledBack).toEqual(initialSnapshot);
  });
});
