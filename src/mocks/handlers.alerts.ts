import { http } from 'msw';

import {
  deleteAlert,
  listAlerts,
  seedAlerts,
  subscribeAlert,
  type AlertStore,
} from './resolvers/alerts';
import { apiPath, mockResultResponse } from './utils';

/**
 * Product alert store for the MSW backend. Seed and endpoint logic are shared
 * with the `/api/v1` route mock (`resolvers/alerts.ts`).
 */
export const mockAlerts: AlertStore = seedAlerts();

export function resetMockAlerts() {
  Object.assign(mockAlerts, seedAlerts());
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const alertsHandlers = [
  http.get(apiPath('/alerts'), ({ request }) =>
    mockResultResponse(listAlerts(mockAlerts, new URL(request.url).searchParams)),
  ),
  http.post(apiPath('/alerts'), async ({ request }) =>
    mockResultResponse(subscribeAlert(mockAlerts, await readJson(request))),
  ),
  http.delete(apiPath('/alerts/:id'), ({ params }) =>
    mockResultResponse(deleteAlert(mockAlerts, String(params.id))),
  ),
];
