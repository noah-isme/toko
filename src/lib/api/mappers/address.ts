/**
 * Address data mappers
 * Transform between API format (snake_case) and app format (camelCase)
 */

import type { ApiAddressResponse, ApiCreateAddressRequest } from '../types';

import type { Address, AddressInput } from '@/entities/address/types';

/**
 * Transform API address response to app Address format
 */
export function mapAddressFromApi(apiAddress: ApiAddressResponse): Address {
  return {
    id: apiAddress.id,
    fullName: apiAddress.full_name,
    phone: apiAddress.phone,
    line1: apiAddress.line1,
    line2: apiAddress.line2,
    city: apiAddress.city,
    province: apiAddress.province,
    postalCode: apiAddress.postal_code,
    country: apiAddress.country,
    isDefault: apiAddress.is_default,
    createdAt: apiAddress.created_at,
    updatedAt: apiAddress.updated_at,
  };
}

/**
 * Transform app AddressInput to API request format
 */
export function mapAddressToApi(input: AddressInput): ApiCreateAddressRequest {
  return {
    full_name: input.fullName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    province: input.province,
    postal_code: input.postalCode,
    country: input.country,
    is_default: false, // Will be set by backend or separate endpoint
  };
}

/**
 * Transform app AddressInput (partial) to API update request format
 */
export function mapAddressUpdateToApi(
  input: Partial<AddressInput> & { isDefault?: boolean },
): Partial<ApiCreateAddressRequest> {
  const result: Partial<ApiCreateAddressRequest> = {};

  if (input.fullName !== undefined) result.full_name = input.fullName;
  if (input.phone !== undefined) result.phone = input.phone;
  if (input.line1 !== undefined) result.line1 = input.line1;
  if (input.line2 !== undefined) result.line2 = input.line2;
  if (input.city !== undefined) result.city = input.city;
  if (input.province !== undefined) result.province = input.province;
  if (input.postalCode !== undefined) result.postal_code = input.postalCode;
  if (input.country !== undefined) result.country = input.country;
  if (input.isDefault !== undefined) result.is_default = input.isDefault;

  return result;
}
