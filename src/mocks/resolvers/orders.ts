import { buildOrderDetail, buildOrderList } from '../factories/order';

import type { MockResolver } from './types';

/** Order history (`status`, `page`, `limit`, plus `empty`/`error` test switches) and detail. */
export const resolveOrders: MockResolver = ({ path, method, searchParams }) => {
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
