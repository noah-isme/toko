import { HttpResponse, http } from 'msw';

import { apiPath } from './utils';

import type { Notification } from '@/lib/api/types';

/**
 * In-memory notification store for the mock backend. Seeded with a mix of
 * read/unread items so the bell badge and list have something to show in
 * mock mode and tests.
 */
export const mockNotifications: Notification[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    type: 'shipment_delivered',
    title: 'Pesanan tiba',
    body: 'Pesanan Anda telah sampai di tujuan.',
    data: { orderId: 'order-1001', topic: 'shipment.delivered' },
    read: false,
    readAt: null,
    createdAt: '2026-07-22T10:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    type: 'order_paid',
    title: 'Pembayaran diterima',
    body: 'Pembayaran pesanan Anda telah kami terima.',
    data: { orderId: 'order-1001', topic: 'order.paid' },
    read: false,
    readAt: null,
    createdAt: '2026-07-21T08:30:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    type: 'order_canceled',
    title: 'Pesanan dibatalkan',
    body: 'Pesanan Anda telah dibatalkan.',
    data: { orderId: 'order-0999', topic: 'order.canceled' },
    read: true,
    readAt: '2026-07-20T12:00:00Z',
    createdAt: '2026-07-20T11:45:00Z',
  },
];

export const notificationsHandlers = [
  // GET /notifications?page=&limit= — paginated list, most recent first
  http.get(apiPath('/notifications'), ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.max(1, Number(url.searchParams.get('limit') ?? '20'));
    const start = (page - 1) * limit;
    const data = mockNotifications.slice(start, start + limit);

    return HttpResponse.json({
      data,
      pagination: {
        page,
        per_page: limit,
        total_items: mockNotifications.length,
      },
    });
  }),

  // GET /notifications/unread-count — badge counter
  http.get(apiPath('/notifications/unread-count'), () => {
    const unread = mockNotifications.filter((n) => !n.read).length;
    return HttpResponse.json({ unread });
  }),

  // POST /notifications/:id/read — mark one read (idempotent)
  http.post(apiPath('/notifications/:id/read'), ({ params }) => {
    const { id } = params as { id: string };
    const item = mockNotifications.find((n) => n.id === id);
    if (item && !item.read) {
      item.read = true;
      item.readAt = new Date().toISOString();
    }
    return HttpResponse.json({ read: true });
  }),

  // POST /notifications/read-all — mark all read (204)
  http.post(apiPath('/notifications/read-all'), () => {
    const now = new Date().toISOString();
    for (const n of mockNotifications) {
      if (!n.read) {
        n.read = true;
        n.readAt = now;
      }
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
