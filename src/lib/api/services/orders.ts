/**
 * Orders and Checkout API Service
 */
import { apiClient } from '../apiClient';
import type {
  ApiResponse,
  PaginatedResponse,
  CheckoutRequest,
  CheckoutResponse,
  Order,
  OrderDetail,
  CancelOrderResponse,
  Shipment,
} from '../types';

export const ordersApi = {
  /**
   * Create order (checkout)
   */
  async checkout(data: CheckoutRequest): Promise<CheckoutResponse> {
    const response = await apiClient<ApiResponse<CheckoutResponse>>('/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * List user orders with pagination
   */
  async getOrders(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return await apiClient<PaginatedResponse<Order>>(`/orders?${params.toString()}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get order detail by ID
   */
  async getOrder(orderId: string): Promise<OrderDetail> {
    const response = await apiClient<ApiResponse<OrderDetail>>(`/orders/${orderId}`, {
      method: 'GET',
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const response = await apiClient<ApiResponse<CancelOrderResponse>>(
      `/orders/${orderId}/cancel`,
      {
        method: 'POST',
        requiresAuth: true,
      },
    );
    return response.data;
  },

  /**
   * Get shipment tracking details
   */
  async getShipment(orderId: string): Promise<Shipment> {
    const response = await apiClient<ApiResponse<Shipment>>(`/orders/${orderId}/shipment`, {
      method: 'GET',
      requiresAuth: true,
    });
    return response.data;
  },
};
