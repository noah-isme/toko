import type { Notification } from '@/lib/api/types';

const PRODUCT_ALERT_TYPES = new Set(['back_in_stock', 'price_drop']);

/**
 * In-app destination for a notification, from its `data` payload. Order and
 * shipment notifications carry an `orderId`; product alerts (back_in_stock,
 * price_drop) carry the product `slug`. Anything else opens the list.
 */
export function notificationHref(notification: Notification): string {
  const { orderId, slug } = notification.data ?? {};
  if (typeof orderId === 'string' && orderId) {
    return `/account/orders/${orderId}`;
  }
  if (PRODUCT_ALERT_TYPES.has(notification.type) && typeof slug === 'string' && slug) {
    return `/products/${encodeURIComponent(slug)}`;
  }
  return '/account/notifications';
}
