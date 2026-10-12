/**
 * Admin display helpers that are not plain formatting: status labels, voucher values and the
 * voucher activity rule. Currency/date formatting lives in `useAdminFormat()` (next-intl).
 */
import type { useFormatter, useTranslations } from 'next-intl';

import type { AdminOrderStatus, AdminVoucher } from './types';

/** The `admin` translator (`useTranslations('admin')`). */
export type AdminTranslator = ReturnType<typeof useTranslations<'admin'>>;

type Formatter = ReturnType<typeof useFormatter>;

/** Localized label of an order status (`admin.status.<STATUS>`); unknown values pass through. */
export function orderStatusLabel(t: AdminTranslator, status: AdminOrderStatus): string {
  const key = `status.${status}` as const;
  return t.has(key) ? t(key) : status;
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

/**
 * Discount display string for a voucher in the active locale: `admin.voucher.percentValue`
 * (`12,5%` / `12.5%`) for percent vouchers, the currency amount for fixed ones.
 */
export function voucherValueLabel(
  t: AdminTranslator,
  format: Formatter,
  voucher: AdminVoucher,
): string {
  if (voucher.kind === 'percent') {
    return t('voucher.percentValue', { value: (voucher.percentBps ?? 0) / 100 });
  }
  return format.number(voucher.value, 'currency');
}

/** A voucher is active when it is inside its validity window and has usage left. */
export function isVoucherActive(voucher: AdminVoucher, now: Date = new Date()): boolean {
  if (voucher.validFrom && new Date(voucher.validFrom) > now) return false;
  if (voucher.validTo && new Date(voucher.validTo) < now) return false;
  if (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) return false;
  return true;
}
