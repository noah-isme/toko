import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from '../utils';

import {
  addressInputSchema,
  addressListSchema,
  addressSchema,
  addressUpdateInputSchema,
} from '@/entities/address/schemas';
import type { Address } from '@/entities/address/types';


function createMockAddress(overrides: Partial<Address> = {}): Address {
  const timestamp = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    fullName: faker.person.fullName(),
    phone: faker.phone.number({ style: 'international' }),
    line1: faker.location.streetAddress(),
    line2: faker.location.secondaryAddress(),
    city: faker.location.city(),
    province: faker.location.state(),
    postalCode: faker.location.zipCode(),
    country: 'ID',
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

let addresses: Address[] = [
  createMockAddress({ isDefault: true, city: 'Jakarta', province: 'DKI Jakarta' }),
  createMockAddress({ city: 'Bandung', province: 'Jawa Barat' }),
  createMockAddress({ city: 'Surabaya', province: 'Jawa Timur' }),
];

function setDefaultAddressInMemory(id: string) {
  let found = false;
  addresses = addresses.map((address) => {
    if (address.id === id) {
      found = true;
      return { ...address, isDefault: true, updatedAt: new Date().toISOString() };
    }
    return { ...address, isDefault: false };
  });
  return found;
}

export const addressHandlers = [
  http.get(apiPath('/addresses'), () => HttpResponse.json(addressListSchema.parse(addresses))),

  http.post(apiPath('/addresses'), async ({ request }) => {
    const payload = await request.json().catch(() => null);
    const parsed = addressInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid address payload' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const newAddress: Address = {
      id: faker.string.uuid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDefault: addresses.length === 0,
      ...parsed.data,
    };

    if (newAddress.isDefault) {
      addresses = addresses.map((address) => ({ ...address, isDefault: false }));
    }

    addresses = [newAddress, ...addresses];

    return HttpResponse.json(addressSchema.parse(newAddress), { status: 201 });
  }),

  http.patch(apiPath('/addresses/:id'), async ({ params, request }) => {
    const payload = await request.json().catch(() => null);
    const parsed = addressUpdateInputSchema.safeParse(payload);

    if (!parsed.success) {
      return HttpResponse.json({ message: 'Invalid address payload' }, { status: 400 });
    }

    const id = params.id as string;
    const targetIndex = addresses.findIndex((address) => address.id === id);

    if (targetIndex === -1) {
      return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
    }

    const patch = parsed.data;
    const next = { ...addresses[targetIndex], ...patch, updatedAt: new Date().toISOString() };
    addresses[targetIndex] = next;

    if (patch.isDefault) {
      addresses = addresses.map((address) => ({
        ...address,
        isDefault: address.id === id,
      }));
    }

    return HttpResponse.json(addressSchema.parse(addresses[targetIndex]));
  }),

  http.delete(apiPath('/addresses/:id'), ({ params }) => {
    const id = params.id as string;
    const target = addresses.find((address) => address.id === id);

    if (!target) {
      return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
    }

    addresses = addresses.filter((address) => address.id !== id);

    if (target.isDefault && addresses.length > 0) {
      addresses[0] = { ...addresses[0], isDefault: true };
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiPath('/addresses/:id/default'), ({ params }) => {
    const id = params.id as string;
    const found = setDefaultAddressInMemory(id);

    if (!found) {
      return HttpResponse.json({ message: 'Address not found' }, { status: 404 });
    }

    const current = addresses.find((address) => address.id === id)!;
    return HttpResponse.json(addressSchema.parse(current));
  }),
];
