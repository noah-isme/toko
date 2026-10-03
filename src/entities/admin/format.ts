/**
 * Formatting helpers used across admin pages.
 */
import type { AdminOrderStatus, AdminVoucher } from './types';

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/** Human label for an order status enum value. */
export function orderStatusLabel(status: AdminOrderStatus): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'PAID':
      return 'Paid';
    case 'PACKED':
      return 'Packed';
    case 'SHIPPED':
      return 'Shipped';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/** Discount display string for a voucher, percent or fixed. */
export function voucherValueLabel(voucher: AdminVoucher): string {
  if (voucher.kind === 'percent') {
    const bps = voucher.percentBps ?? 0;
    return `${bps / 100}%`;
  }
  return formatCurrency(voucher.value);
}

/** A voucher is active when it is inside its validity window and has usage left. */
export function isVoucherActive(voucher: AdminVoucher, now: Date = new Date()): boolean {
  if (voucher.validFrom && new Date(voucher.validFrom) > now) return false;
  if (voucher.validTo && new Date(voucher.validTo) < now) return false;
  if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) return false;
  return true;
}
