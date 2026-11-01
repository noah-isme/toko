import { apiDownload, ApiClientError, AuthError } from '@/lib/api/apiClient';
import { saveBlob } from '@/shared/lib/download';

/**
 * Order statuses for which the backend issues a new invoice. An invoice issued
 * earlier also stays downloadable after a cancellation; that case answers 409
 * INVOICE_NOT_AVAILABLE when no invoice was ever issued.
 */
const INVOICEABLE_STATUSES = new Set([
  'paid',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]);

export function isInvoiceIssuable(status: string | null | undefined): boolean {
  return INVOICEABLE_STATUSES.has((status ?? '').toLowerCase());
}

export function isCancelledStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'cancelled' || normalized === 'canceled';
}

/**
 * Whether to offer the download at all: paid orders, plus cancelled orders
 * that were paid before the cancellation (only those can hold an invoice; the
 * backend issues the number on the first download, and most cancelled orders
 * were never paid).
 */
export function canOfferInvoice(
  status: string | null | undefined,
  payment?: { status?: string | null; paidAt?: string | null } | null,
): boolean {
  if (isInvoiceIssuable(status)) return true;
  if (!isCancelledStatus(status)) return false;
  return payment?.status === 'paid' || Boolean(payment?.paidAt);
}

/**
 * Downloads the backend-rendered PDF (`GET /orders/{orderId}/invoice`) and
 * saves it. The server's filename (INV-YYYY-NNNNNN.pdf) wins; the fallback is
 * only used when Content-Disposition is missing or not exposed cross-origin.
 */
export async function downloadOrderInvoice(orderId: string, orderNumber?: string | null) {
  const { blob, filename } = await apiDownload(`/orders/${encodeURIComponent(orderId)}/invoice`, {
    requiresAuth: true,
  });
  saveBlob(blob, filename ?? `invoice-${orderNumber || orderId}.pdf`);
}

export type InvoiceErrorKind =
  | 'notAvailable'
  | 'notAvailableCancelled'
  | 'notFound'
  | 'sessionExpired'
  | 'failed';

/**
 * Maps a download failure to a message key. A 409 on a cancelled order means
 * no invoice was issued before the cancellation, not "pay first".
 */
export function invoiceErrorKind(
  error: unknown,
  options: { cancelled?: boolean } = {},
): InvoiceErrorKind {
  if (error instanceof AuthError) return 'sessionExpired';
  if (error instanceof ApiClientError) {
    if (error.code === 'INVOICE_NOT_AVAILABLE' || error.status === 409) {
      return options.cancelled ? 'notAvailableCancelled' : 'notAvailable';
    }
    if (error.status === 404) return 'notFound';
  }
  return 'failed';
}
