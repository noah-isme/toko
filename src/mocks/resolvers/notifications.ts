import { sessionValue } from './session';
import type { MockResolver, MockResult } from './types';

import type { Notification } from '@/lib/api/types';

/**
 * In-app notifications (docs/contracts/notifications.md). The MSW handlers
 * (`handlers.notifications.ts`) and the route resolver below share the seed and
 * the operations, so both mock layers answer identically; MSW keeps one global
 * list, the route keeps one list per mock session.
 */
const SEED_NOTIFICATIONS: readonly Notification[] = [
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

/** Contract: `limit` defaults to 20 and is clamped to 100. */
const MAX_LIMIT = 100;

export function seedNotifications(): Notification[] {
  return SEED_NOTIFICATIONS.map((notification) => ({
    ...notification,
    data: { ...notification.data },
  }));
}

function positiveInt(raw: string | null, fallback: number) {
  const value = Math.floor(Number(raw ?? fallback));
  return Number.isFinite(value) && value >= 1 ? value : fallback;
}

/**
 * `GET notifications?page=&limit=` in the standard pagination envelope. The
 * store is kept most-recent-first (the seed is ordered that way).
 */
export function listNotifications(store: Notification[], searchParams: URLSearchParams) {
  const page = positiveInt(searchParams.get('page'), 1);
  const limit = Math.min(MAX_LIMIT, positiveInt(searchParams.get('limit'), 20));
  const start = (page - 1) * limit;
  return {
    data: store.slice(start, start + limit),
    pagination: { page, perPage: limit, totalItems: store.length },
  };
}

export function unreadNotificationCount(store: Notification[]) {
  return { unread: store.filter((n) => !n.read).length };
}

/**
 * `POST notifications/:id/read`: idempotent. Already-read and unknown ids also
 * answer `{ read: true }` (the contract leaks nothing about other users' ids).
 */
export function markNotificationRead(store: Notification[], id: string): MockResult {
  const item = store.find((n) => n.id === id);
  if (item && !item.read) {
    item.read = true;
    item.readAt = new Date().toISOString();
  }
  return { read: true };
}

/** `POST notifications/read-all`: 204 No Content. */
export function markAllNotificationsRead(store: Notification[]): MockResult {
  const now = new Date().toISOString();
  for (const n of store) {
    if (!n.read) {
      n.read = true;
      n.readAt = now;
    }
  }
  return { status: 204 };
}

const READ_PATH = /^notifications\/([^/]+)\/read$/;

export const resolveNotifications: MockResolver = ({ path, method, sessionId, searchParams }) => {
  if (path !== 'notifications' && !path.startsWith('notifications/')) return undefined;
  const store = () => sessionValue('notifications', sessionId, seedNotifications);

  if (method === 'GET' && path === 'notifications') {
    return listNotifications(store(), searchParams);
  }
  if (method === 'GET' && path === 'notifications/unread-count') {
    return unreadNotificationCount(store());
  }
  if (method === 'POST' && path === 'notifications/read-all') {
    return markAllNotificationsRead(store());
  }
  const read = method === 'POST' ? READ_PATH.exec(path) : null;
  if (read) return markNotificationRead(store(), decodeURIComponent(read[1]));
  return undefined;
};
