/**
 * Admin report DTOs (`GET /admin/reports/*`).
 *
 * Revenue rule (every revenue figure): an order counts iff its status is PAID,
 * PACKED, SHIPPED, OUT_FOR_DELIVERY or DELIVERED and it is not fully refunded.
 * Order-level amounts are net of PENDING and SUCCEEDED refunds; item-level
 * amounts (category and product rows) are the gross item subtotal, so they can
 * be higher than order-level revenue. Money is integer IDR.
 */

export type AdminReportKind = 'sales-by-category' | 'sales-by-product' | 'conversion' | 'customers';

/**
 * Range query shared by every report. `from` is inclusive and `to` exclusive;
 * both are `YYYY-MM-DD` (tenant-local midnight) or RFC3339.
 */
export interface AdminReportRangeParams {
  from?: string;
  to?: string;
}

export interface AdminReportProductParams extends AdminReportRangeParams {
  page?: number;
  limit?: number;
  categoryId?: string;
}

/** The resolved range every report echoes back. */
export interface AdminReportRange {
  /** RFC3339 with the tenant offset. */
  from: string;
  /** Exclusive end, RFC3339 with the tenant offset. */
  to: string;
  /** IANA timezone the report was bucketed in. */
  timezone: string;
}

export interface AdminReportCategoryRow {
  /** null for Uncategorized. */
  categoryId: string | null;
  categoryName: string;
  categorySlug: string | null;
  unitsSold: number;
  orders: number;
  revenue: number;
  /** revenue / totalRevenue, 4 decimals. */
  share: number;
}

export interface AdminReportSalesByCategory extends AdminReportRange {
  totalRevenue: number;
  totalUnits: number;
  rows: AdminReportCategoryRow[];
}

export interface AdminReportProductRow {
  productId: string | null;
  title: string;
  slug: string;
  categoryId: string | null;
  categoryName: string;
  unitsSold: number;
  orders: number;
  revenue: number;
}

export interface AdminReportSalesByProduct {
  data: AdminReportProductRow[];
  pagination: { page: number; perPage: number; totalItems: number };
  range: AdminReportRange;
}

export interface AdminReportConversion extends AdminReportRange {
  cartsCreated: number;
  checkoutsStarted: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  paidRevenue: number;
  refundedAmount: number;
  /** checkoutsStarted / cartsCreated; can exceed 1. */
  checkoutRate: number;
  /** paidOrders / checkoutsStarted. */
  paymentRate: number;
  /** paidOrders / cartsCreated; can exceed 1. */
  conversionRate: number;
}

export interface AdminReportCustomersDay {
  /** Tenant-local `YYYY-MM-DD`. */
  day: string;
  newCustomers: number;
  returningCustomers: number;
  orders: number;
  revenue: number;
}

export interface AdminReportCustomers extends AdminReportRange {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  /** returningCustomers / totalCustomers, 4 decimals. */
  repeatRate: number;
  ordersFromNew: number;
  ordersFromReturning: number;
  revenueFromNew: number;
  revenueFromReturning: number;
  guestOrders: number;
  guestRevenue: number;
  /** Customer (non-guest) orders per tenant-local day; does not sum to the summary. */
  daily: AdminReportCustomersDay[];
}
