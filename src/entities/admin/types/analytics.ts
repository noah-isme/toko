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
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  topProducts: AdminTopProduct[];
}
