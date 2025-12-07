/**
 * User Addresses API Service
 */
import { apiClient } from '../apiClient';
import { mapAddressFromApi, mapAddressToApi, mapAddressUpdateToApi } from '../mappers';
import type { ApiResponse, PaginatedResponse, ApiAddressResponse } from '../types';

import type { Address, AddressInput } from '@/entities/address/types';

export const addressApi = {
  /**
   * List user addresses
   */
  async getAddresses(page: number = 1, limit: number = 20): Promise<Address[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient<PaginatedResponse<ApiAddressResponse>>(
      `/users/me/addresses?${params.toString()}`,
      {
        method: 'GET',
        requiresAuth: true,
      },
    );

    // Transform API response to app format
    return response.data.map(mapAddressFromApi);
  },

  /**
   * Create new address
   */
  async createAddress(data: AddressInput): Promise<Address> {
    const apiPayload = mapAddressToApi(data);
    const response = await apiClient<ApiResponse<ApiAddressResponse>>('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      requiresAuth: true,
    });
    return mapAddressFromApi(response.data);
  },

  /**
   * Update address
   */
  async updateAddress(
    addressId: string,
    data: Partial<AddressInput> & { isDefault?: boolean },
  ): Promise<Address> {
    const apiPayload = mapAddressUpdateToApi(data);
    const response = await apiClient<ApiResponse<ApiAddressResponse>>(
      `/users/me/addresses/${addressId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(apiPayload),
        requiresAuth: true,
      },
    );
    return mapAddressFromApi(response.data);
  },

  /**
   * Delete address
   */
  async deleteAddress(addressId: string): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse<{ message: string }>>(
      `/users/me/addresses/${addressId}`,
      {
        method: 'DELETE',
        requiresAuth: true,
      },
    );
    return response.data;
  },
};
