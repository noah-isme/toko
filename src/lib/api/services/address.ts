/**
 * User Addresses API Service
 */
import { apiClient } from '../apiClient';
import type {
  ApiResponse,
  PaginatedResponse,
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
} from '../types';

export const addressApi = {
  /**
   * List user addresses
   */
  async getAddresses(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Address>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return await apiClient<PaginatedResponse<Address>>(`/users/me/addresses?${params.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Create new address
   */
  async createAddress(data: CreateAddressRequest): Promise<Address> {
    const response = await apiClient<ApiResponse<Address>>('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Update address
   */
  async updateAddress(addressId: string, data: UpdateAddressRequest): Promise<Address> {
    const response = await apiClient<ApiResponse<Address>>(`/users/me/addresses/${addressId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
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
