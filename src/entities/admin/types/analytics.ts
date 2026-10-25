/** Admin analytics DTOs. */

export type AdminAnalyticsRange = '7d' | '30d' | '90d' | 'all';

export interface AdminTopProduct {
  productId: string;
  title: string;
  slug: string;
  unitsSold: number;
  revenue: number;
}

export interface AdminAnalyticsOverview {
  range: AdminAnalyticsRange;
  /** Net revenue (IDR) of orders matching the revenue rule. */
  totalRevenue: number;
  /** Orders matching the revenue rule (PAID through DELIVERED, not fully refunded). */
  revenueOrders: number;
  /** All orders in range, any status. */
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  /** totalRevenue / revenueOrders, rounded; 0 when there are none. */
  averageOrderValue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  topProducts: AdminTopProduct[];
}
