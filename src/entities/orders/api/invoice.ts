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

/** Whether to offer the download at all: paid orders, plus cancelled ones that may hold an invoice. */
export function canOfferInvoice(status: string | null | undefined): boolean {
  const normalized = (status ?? '').toLowerCase();
  return isInvoiceIssuable(normalized) || normalized === 'cancelled' || normalized === 'canceled';
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

export type InvoiceErrorKind = 'notAvailable' | 'notFound' | 'sessionExpired' | 'failed';

export function invoiceErrorKind(error: unknown): InvoiceErrorKind {
  if (error instanceof AuthError) return 'sessionExpired';
  if (error instanceof ApiClientError) {
    if (error.code === 'INVOICE_NOT_AVAILABLE' || error.status === 409) return 'notAvailable';
    if (error.status === 404) return 'notFound';
  }
  return 'failed';
}
