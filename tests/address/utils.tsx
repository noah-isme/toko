import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse, delay, http } from 'msw';
import React, { type ReactNode } from 'react';

import type { AddressInput, AddressUpdateInput } from '@/entities/address/schemas';
import type { Address } from '@/entities/address/types';
import { server } from '@/mocks/server';
import { apiPath } from '@/mocks/utils';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function withQueryClient(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

export function mockAddressHandlers(initial: Address[]) {
  let store = [...initial];
  let counter = 0;

  server.use(
    http.get(apiPath('/addresses'), () => HttpResponse.json(store)),
    http.post(apiPath('/addresses'), async ({ request }) => {
      await delay(25);
      const payload = (await request.json()) as AddressInput;
      const timestamp = new Date().toISOString();
      const newAddress: Address = {
        id: payload.fullName
          ? `addr-${payload.fullName}-${counter++}`
          : `addr-${Date.now()}-${counter++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDefault: store.length === 0,
        ...payload,
      };

      if (newAddress.isDefault) {
        store = store.map((address) => ({ ...address, isDefault: false }));
      }

      store = [newAddress, ...store];
      return HttpResponse.json(newAddress, { status: 201 });
    }),
    http.patch(apiPath('/addresses/:id'), async ({ params, request }) => {
      await delay(25);
      const id = params.id as string;
      const payload = (await request.json()) as AddressUpdateInput;
      const targetIndex = store.findIndex((address) => address.id === id);
      if (targetIndex === -1) {
        return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
      }

      const updated = {
        ...store[targetIndex],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      store[targetIndex] = updated;

      if (payload.isDefault) {
        store = store.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }));
      }

      return HttpResponse.json(store.find((address) => address.id === id));
    }),
    http.delete(apiPath('/addresses/:id'), async ({ params }) => {
      await delay(25);
      const id = params.id as string;
      const target = store.find((address) => address.id === id);
      if (!target) {
        return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
      }

      store = store.filter((address) => address.id !== id);
      if (target.isDefault && store.length > 0) {
        store[0] = { ...store[0], isDefault: true };
      }

      return HttpResponse.json(null, { status: 204 });
    }),
    http.post(apiPath('/addresses/:id/default'), async ({ params }) => {
      await delay(20);
      const id = params.id as string;
      const exists = store.some((address) => address.id === id);
      if (!exists) {
        return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
      }

      store = store.map((address) => ({
        ...address,
        isDefault: address.id === id,
        updatedAt: address.id === id ? new Date().toISOString() : address.updatedAt,
      }));

      return HttpResponse.json(store.find((address) => address.id === id));
    }),
  );

  return {
    getStore: () => store,
  };
}
