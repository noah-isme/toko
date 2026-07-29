/**
 * Address data mappers
 * Transform between API and app address formats
 */

import type { ApiAddressResponse, ApiCreateAddressRequest } from '../types';

import type { Address, AddressInput } from '@/entities/address/types';

/**
 * Transform API address response to app Address format
 */
export function mapAddressFromApi(apiAddress: ApiAddressResponse): Address {
  return apiAddress;
}

/**
 * Transform app AddressInput to API request format
 */
export function mapAddressToApi(input: AddressInput): ApiCreateAddressRequest {
  return {
    ...input,
    isDefault: false,
  };
}

/**
 * Transform app AddressInput (partial) to API update request format
 */
export function mapAddressUpdateToApi(
  input: Partial<AddressInput> & { isDefault?: boolean },
): Partial<ApiCreateAddressRequest> {
  const result: Partial<ApiCreateAddressRequest> = {};

  if (input.receiverName !== undefined) result.receiverName = input.receiverName;
  if (input.phone !== undefined) result.phone = input.phone;
  if (input.addressLine1 !== undefined) result.addressLine1 = input.addressLine1;
  if (input.addressLine2 !== undefined) result.addressLine2 = input.addressLine2;
  if (input.city !== undefined) result.city = input.city;
  if (input.province !== undefined) result.province = input.province;
  if (input.postalCode !== undefined) result.postalCode = input.postalCode;
  if (input.country !== undefined) result.country = input.country;
  if (input.isDefault !== undefined) result.isDefault = input.isDefault;

  return result;
}
