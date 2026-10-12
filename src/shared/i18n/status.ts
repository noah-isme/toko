import type { useTranslations } from 'next-intl';

/** The `account` translator (`useTranslations('account')` / `getTranslations('account')`). */
export type AccountTranslator = ReturnType<typeof useTranslations<'account'>>;

/**
 * Localized label of an order status (`account.orderStatus.<status>`), or `undefined` when the
 * catalog has no label for it, so callers keep their own fallback for unknown statuses.
 */
export function orderStatusLabel(t: AccountTranslator, status: string): string | undefined {
  const key = `orderStatus.${status.toLowerCase()}`;
  return status.toLowerCase() !== 'all' && t.has(key as never) ? t(key as never) : undefined;
}

/** Localized label of a shipment status (`account.shipmentStatus.<status>`), or `undefined`. */
export function shipmentStatusLabel(t: AccountTranslator, status: string): string | undefined {
  const key = `shipmentStatus.${status.toLowerCase()}`;
  return t.has(key as never) ? t(key as never) : undefined;
}

/** `pending_payment` -> `Pending Payment`: the display fallback for statuses without a label. */
export function humanizeStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
