import {
  AddressInput,
  AddressUpdateInput,
} from './schemas';
import type { Address } from './types';
import { addressApi } from '@/lib/api/services/address';

// Validation is now handled by the service/mappers or backend
// We just forward the calls to the correct service

function assertUserId(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw new Error('userId is required for address operations');
  }
}

export async function listAddresses(userId: string | null | undefined): Promise<Address[]> {
  assertUserId(userId);
  // Fetch up to 100 addresses to ensure we get them all for the address book
  return addressApi.getAddresses(1, 100);
}

export async function createAddress(input: AddressInput): Promise<Address> {
  return addressApi.createAddress(input);
}

export async function updateAddress(id: string, input: AddressUpdateInput): Promise<Address> {
  return addressApi.updateAddress(id, input);
}

export async function deleteAddress(id: string): Promise<void> {
  await addressApi.deleteAddress(id);
}

export async function setDefaultAddress(id: string): Promise<Address> {
  // Synthesize "Set Default" by updating the address with isDefault: true
  // The backend should handle unsetting other defaults if logic exists there,
  // or the hook handles optimistic updates.
  return addressApi.updateAddress(id, { isDefault: true });
}
