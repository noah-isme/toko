import {
  AddressInput,
  AddressUpdateInput,
  addressInputSchema,
  addressListSchema,
  addressSchema,
  addressUpdateInputSchema,
} from './schemas';
import type { Address } from './types';

import { apiClient } from '@/lib/api/apiClient';

const ADDRESS_PATH = '/addresses';

function assertUserId(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw new Error('userId is required for address operations');
  }
}

export async function listAddresses(userId: string | null | undefined): Promise<Address[]> {
  assertUserId(userId);
  return apiClient(ADDRESS_PATH, {
    schema: addressListSchema,
  });
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const payload = addressInputSchema.parse(input);
  return apiClient(ADDRESS_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
    schema: addressSchema,
  });
}

export async function updateAddress(id: string, input: AddressUpdateInput): Promise<Address> {
  const payload = addressUpdateInputSchema.parse(input);
  return apiClient(`${ADDRESS_PATH}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    schema: addressSchema,
  });
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient(`${ADDRESS_PATH}/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return apiClient(`${ADDRESS_PATH}/${id}/default`, {
    method: 'POST',
    schema: addressSchema,
  });
}
