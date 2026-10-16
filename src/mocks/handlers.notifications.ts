import { http } from 'msw';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  seedNotifications,
  unreadNotificationCount,
} from './resolvers/notifications';
import { apiPath, mockResultResponse } from './utils';

import type { Notification } from '@/lib/api/types';

/**
 * In-memory notification store for the MSW backend, seeded with a mix of
 * read/unread items so the bell badge and list have something to show. The
 * seed and the endpoint logic are shared with the `/api/v1` route mock
 * (`resolvers/notifications.ts`), which keeps one such list per mock session.
 */
export const mockNotifications: Notification[] = seedNotifications();

export function resetMockNotifications() {
  mockNotifications.splice(0, mockNotifications.length, ...seedNotifications());
}

export const notificationsHandlers = [
  // GET /notifications?page=&limit= — paginated list, most recent first
  http.get(apiPath('/notifications'), ({ request }) =>
    mockResultResponse(listNotifications(mockNotifications, new URL(request.url).searchParams)),
  ),

  // GET /notifications/unread-count — badge counter
  http.get(apiPath('/notifications/unread-count'), () =>
    mockResultResponse(unreadNotificationCount(mockNotifications)),
  ),

  // POST /notifications/:id/read — mark one read (idempotent)
  http.post(apiPath('/notifications/:id/read'), ({ params }) =>
    mockResultResponse(markNotificationRead(mockNotifications, String(params.id))),
  ),

  // POST /notifications/read-all — mark all read (204)
  http.post(apiPath('/notifications/read-all'), () =>
    mockResultResponse(markAllNotificationsRead(mockNotifications)),
  ),
];
