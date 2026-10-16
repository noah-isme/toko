import type {
  AdminProduct,
  AdminProductDetail,
  AdminProductInput,
  AdminProductListParams,
} from '../types';

import { buildQuery } from './query';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

export const adminProductsApi = {
  async getProducts(params: AdminProductListParams = {}): Promise<PaginatedResponse<AdminProduct>> {
    return apiClient<PaginatedResponse<AdminProduct>>(`/admin/products${buildQuery(params)}`, {
      requiresAuth: true,
    });
  },

  /** Accepts a product UUID or slug. */
  async getProduct(id: string): Promise<AdminProductDetail> {
    const response = await apiClient<ApiResponse<AdminProductDetail>>(`/admin/products/${id}`, {
      requiresAuth: true,
    });
    return response.data;
  },

  async createProduct(data: AdminProductInput): Promise<{ id: string; slug: string }> {
    const response = await apiClient<ApiResponse<{ id: string; slug: string }>>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Partial update. Only the keys present in `data` change; passing null for a
   * nullable field clears it.
   */
  async updateProduct(id: string, data: AdminProductInput): Promise<void> {
    await apiClient<void>(`/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient<void>(`/admin/products/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /** Writes primary-variant stock and keeps the in_stock flag consistent. */
  async updateProductStock(
    id: string,
    data: { stock?: number; inStock?: boolean },
  ): Promise<{ id: string; inStock: boolean; stock: number | null }> {
    const response = await apiClient<
      ApiResponse<{ id: string; inStock: boolean; stock: number | null }>
    >(`/admin/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },
};
