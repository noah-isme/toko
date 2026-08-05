/**
 * Catalog API Service (Products, Categories, Brands)
 */
import { apiClient } from '../apiClient';
import { mapApiProductToProduct } from '../mappers/product';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductDetail,
  ProductFilters,
  Category,
  Brand,
} from '../types';

export const catalogApi = {
  /**
   * List all categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient<ApiResponse<Category[]>>('/categories', {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * List all brands
   */
  async getBrands(): Promise<Brand[]> {
    const response = await apiClient<ApiResponse<Brand[]>>('/brands', {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * List products with optional filters
   */
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();

    if (filters?.q) params.append('q', filters.q);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.brand) params.append('brand', filters.brand);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.inStock !== undefined) params.append('inStock', filters.inStock.toString());
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    } else {
      params.append('limit', '100');
    }

    const query = params.toString();
    const path = query ? `/products?${query}` : '/products';

    const response = await apiClient<PaginatedResponse<any>>(path, {
      method: 'GET',
    });
    return {
      ...response,
      data: response.data.map(mapApiProductToProduct) as any,
    };
  },

  /**
   * Get product detail by slug
   */
  async getProduct(slug: string): Promise<ProductDetail> {
    const response = await apiClient<ApiResponse<any>>(`/products/${slug}`, {
      method: 'GET',
    });
    return mapApiProductToProduct(response.data) as any;
  },

  /**
   * Get related products
   */
  async getRelatedProducts(slug: string): Promise<Product[]> {
    const response = await apiClient<ApiResponse<any[]>>(`/products/${slug}/related`, {
      method: 'GET',
    });
    return response.data.map(mapApiProductToProduct) as any;
  },

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(productId: string): Promise<Product[]> {
    const response = await apiClient<ApiResponse<any[]>>(`/products/${productId}/frequently-bought-together`, {
      method: 'GET',
    });
    return response.data.map(mapApiProductToProduct) as any;
  },

  /**
   * Get customers also viewed products
   */
  async getCustomersAlsoViewed(productId: string): Promise<Product[]> {
    const response = await apiClient<ApiResponse<any[]>>(`/products/${productId}/also-viewed`, {
      method: 'GET',
    });
    return response.data.map(mapApiProductToProduct) as any;
  },

  /**
   * Get personalized recommendations for current user
   */
  async getPersonalizedRecommendations(limit: number = 10): Promise<Product[]> {
    const response = await apiClient<ApiResponse<any[]>>(
      `/recommendations/personalized?limit=${limit}`,
      { method: 'GET' },
    );
    return response.data.map(mapApiProductToProduct) as any;
  },

  /**
   * Get trending/popular products
   */
  async getTrendingProducts(limit: number = 10): Promise<Product[]> {
    const response = await apiClient<ApiResponse<any[]>>(
      `/recommendations/trending?limit=${limit}`,
      { method: 'GET' },
    );
    return response.data.map(mapApiProductToProduct) as any;
  },
};
