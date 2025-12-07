/**
 * Cart API Service
 */
import { apiClient } from '../apiClient';
import type {
  ApiResponse,
  Cart,
  CreateCartRequest,
  CreateCartResponse,
  AddCartItemRequest,
  UpdateCartItemRequest,
  ApplyVoucherRequest,
  ApplyVoucherResponse,
  MergeCartRequest,
  MergeCartResponse,
  ShippingQuoteRequest,
  ShippingRate,
  TaxQuoteResponse,
} from '../types';

export const cartApi = {
  /**
   * Create a new cart (for guest users)
   */
  async createCart(data?: CreateCartRequest): Promise<CreateCartResponse> {
    const response = await apiClient<ApiResponse<CreateCartResponse>>('/carts', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    return response.data;
  },

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<Cart> {
    const response = await apiClient<ApiResponse<Cart>>(`/carts/${cartId}`, {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Add item to cart
   */
  async addItem(cartId: string, data: AddCartItemRequest): Promise<Cart> {
    const response = await apiClient<ApiResponse<Cart>>(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update cart item quantity
   */
  async updateItem(cartId: string, itemId: string, data: UpdateCartItemRequest): Promise<Cart> {
    const response = await apiClient<ApiResponse<Cart>>(`/carts/${cartId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const response = await apiClient<ApiResponse<Cart>>(`/carts/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * Apply voucher code to cart
   */
  async applyVoucher(cartId: string, data: ApplyVoucherRequest): Promise<ApplyVoucherResponse> {
    const response = await apiClient<ApiResponse<ApplyVoucherResponse>>(
      `/carts/${cartId}/apply-voucher`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    return response.data;
  },

  /**
   * Remove voucher from cart
   */
  async removeVoucher(cartId: string): Promise<{ voucher: null }> {
    const response = await apiClient<ApiResponse<{ voucher: null }>>(`/carts/${cartId}/voucher`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * Get shipping quote
   */
  async getShippingQuote(cartId: string, data: ShippingQuoteRequest): Promise<ShippingRate[]> {
    const response = await apiClient<ApiResponse<ShippingRate[]>>(
      `/carts/${cartId}/quote/shipping`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    return response.data;
  },

  /**
   * Get tax quote
   */
  async getTaxQuote(cartId: string): Promise<TaxQuoteResponse> {
    const response = await apiClient<ApiResponse<TaxQuoteResponse>>(`/carts/${cartId}/quote/tax`, {
      method: 'POST',
    });
    return response.data;
  },

  /**
   * Merge guest cart to user cart after login
   */
  async mergeCart(data: MergeCartRequest): Promise<MergeCartResponse> {
    const response = await apiClient<ApiResponse<MergeCartResponse>>('/carts/merge', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },
};
