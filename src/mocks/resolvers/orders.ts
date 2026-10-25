import { buildInvoicePdf } from '../factories/invoice';
import { buildOrderDetail, buildOrderList } from '../factories/order';

import { mockBinary } from './binary';
import type { MockResolver, MockResult } from './types';

/** Statuses that may be issued a new invoice (backend contract). */
const INVOICEABLE = new Set(['paid', 'packed', 'shipped', 'out_for_delivery', 'delivered']);

function invoiceNumber(orderId: string) {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  const serial = String((hash % 999999) + 1).padStart(6, '0');
  return `INV-${new Date().getUTCFullYear()}-${serial}`;
}

/**
 * `GET orders/{orderId}/invoice`: a PDF attachment for paid orders, 409
 * INVOICE_NOT_AVAILABLE for unpaid or cancelled ones, 404 for unknown orders.
 * Shared by the `/api/v1` route and the MSW handler.
 */
export function resolveOrderInvoice(orderId: string): MockResult {
  if (orderId === 'non-existent-order') {
    return { status: 404, error: { code: 'NOT_FOUND', message: 'order not found' } };
  }
  const order = buildOrderDetail(orderId);
  if (!INVOICEABLE.has(order.status)) {
    return {
      status: 409,
      error: {
        code: 'INVOICE_NOT_AVAILABLE',
        message: 'invoice is available once the order is paid',
      },
    };
  }
  const number = invoiceNumber(orderId);
  const pdf = buildInvoicePdf([
    `Invoice ${number}`,
    `Order ${order.orderNumber}`,
    `Customer: ${order.user.name}`,
    ...order.items.map((item) => `${item.qty} x ${item.productTitle} - Rp ${item.subtotal}`),
    `Total: Rp ${order.pricing.total}`,
  ]);
  return mockBinary(pdf, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${number}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
}

const INVOICE_PATH = /^orders\/([^/]+)\/invoice$/;

/** Order history (`status`, `page`, `limit`, plus `empty`/`error` test switches) and detail. */
export const resolveOrders: MockResolver = ({ path, method, searchParams }) => {
  const invoice = method === 'GET' ? INVOICE_PATH.exec(path) : null;
  if (invoice) return resolveOrderInvoice(decodeURIComponent(invoice[1]));

  if (path === 'orders' && method === 'GET') {
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (searchParams.get('error') === '500') {
      return { status: 500, error: { message: 'Internal server error' } };
    }
    if (searchParams.get('empty') === 'true' || status === 'empty') {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    const all = buildOrderList();
    const filtered = status && status !== 'all' ? all.filter((o) => o.status === status) : all;
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    };
  }

  if (path.startsWith('orders/') && method === 'GET') {
    const orderId = path.split('/')[1];
    if (orderId === 'non-existent-order') {
      return { status: 404, error: { message: 'Order not found' } };
    }
    return { data: buildOrderDetail(orderId) };
  }
  return undefined;
};
