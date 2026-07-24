import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';

import { notificationsApi } from './notifications';

import { mockNotifications } from '@/mocks/handlers.notifications';
import { server } from '@/mocks/server';

const BASE_URL = 'http://localhost:8080/api/v1';

describe('Notifications API', () => {
  beforeEach(() => {
    // Reset all mock notifications to a known, unread state.
    mockNotifications.splice(
      0,
      mockNotifications.length,
      {
        id: '11111111-1111-1111-1111-111111111111',
        type: 'shipment_delivered',
        title: 'Pesanan tiba',
        body: 'Pesanan Anda telah sampai di tujuan.',
        data: { orderId: 'order-1001', topic: 'shipment.delivered' },
        read: false,
        readAt: null,
        createdAt: '2026-07-24T10:00:00Z',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        type: 'order_paid',
        title: 'Pembayaran diterima',
        body: 'Pembayaran pesanan Anda telah kami terima.',
        data: { orderId: 'order-1001', topic: 'order.paid' },
        read: true,
        readAt: '2026-07-24T09:00:00Z',
        createdAt: '2026-07-24T08:30:00Z',
      },
    );
  });

  it('list validates the snake_case backend response and returns camelCase pagination', async () => {
    const result = await notificationsApi.list(1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      type: 'shipment_delivered',
      read: false,
    });
    expect(result.pagination).toEqual({
      page: 1,
      perPage: 20,
      totalItems: 2,
    });
  });

  it('list throws when the backend pagination is malformed', async () => {
    server.use(
      http.get(`${BASE_URL}/notifications`, () => {
        return HttpResponse.json({
          data: [],
          pagination: { page: 1, perPage: 20, totalItems: 0 },
        });
      }),
    );

    await expect(notificationsApi.list(1, 20)).rejects.toThrow();
  });

  it('unreadCount validates and returns the count', async () => {
    const count = await notificationsApi.unreadCount();
    expect(count).toBe(1);
  });

  it('unreadCount throws when the response is malformed', async () => {
    server.use(
      http.get(`${BASE_URL}/notifications/unread-count`, () => {
        return HttpResponse.json({ count: 1 });
      }),
    );

    await expect(notificationsApi.unreadCount()).rejects.toThrow();
  });

  it('markRead validates the response and marks the item read', async () => {
    await expect(
      notificationsApi.markRead('11111111-1111-1111-1111-111111111111'),
    ).resolves.toBeUndefined();
    expect(mockNotifications[0].read).toBe(true);
  });

  it('markRead throws when the response is malformed', async () => {
    server.use(
      http.post(`${BASE_URL}/notifications/:id/read`, () => {
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      notificationsApi.markRead('11111111-1111-1111-1111-111111111111'),
    ).rejects.toThrow();
  });

  it('markAllRead resolves on 204', async () => {
    await expect(notificationsApi.markAllRead()).resolves.toBeUndefined();
    expect(mockNotifications.every((n) => n.read)).toBe(true);
  });
});
