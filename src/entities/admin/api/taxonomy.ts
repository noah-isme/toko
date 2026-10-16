import type { AdminTaxonomy, AdminTaxonomyInput } from '../types';

import { apiClient } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

export const adminTaxonomyApi = {
  async getCategories(): Promise<AdminTaxonomy[]> {
    const response = await apiClient<ApiResponse<AdminTaxonomy[]>>('/admin/categories', {
      requiresAuth: true,
    });
    return response.data;
  },

  async createCategory(data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateCategory(id: string, data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await apiClient<void>(`/admin/categories/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async getBrands(): Promise<AdminTaxonomy[]> {
    const response = await apiClient<ApiResponse<AdminTaxonomy[]>>('/admin/brands', {
      requiresAuth: true,
    });
    return response.data;
  },

  async createBrand(data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>('/admin/brands', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async updateBrand(id: string, data: AdminTaxonomyInput): Promise<AdminTaxonomy> {
    const response = await apiClient<ApiResponse<AdminTaxonomy>>(`/admin/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  async deleteBrand(id: string): Promise<void> {
    await apiClient<void>(`/admin/brands/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
