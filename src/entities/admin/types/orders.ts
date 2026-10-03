/** Admin order DTOs. */

/** Order status values as stored by the backend enum. */
export type AdminOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface AdminOrder {
  id: string;
  orderNumber?: string | null;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status: AdminOrderStatus;
  /** Latest payment status; empty string when no payment row exists. */
  paymentStatus: string;
  currency: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  voucherCode?: string | null;
  itemsCount: number;
  courier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItem {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  title: string;
  slug: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface AdminOrderDetail extends AdminOrder {
  shippingAddress: Record<string, unknown>;
  shippingOption: Record<string, unknown>;
  notes?: string | null;
  items: AdminOrderItem[];
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  /** Pass 'all' or omit for no status filter. */
  status?: AdminOrderStatus | 'all';
  search?: string;
  /** RFC3339 timestamp or YYYY-MM-DD. */
  startDate?: string;
  endDate?: string;
}

export interface AdminOrderStats {
  totalOrders: number;
  /** Excludes cancelled orders. */
  totalRevenue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

export interface ShipmentData {
  courier: string;
  trackingNumber: string;
}
