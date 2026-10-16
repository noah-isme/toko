import { http } from 'msw';

import {
  getPushPreferences,
  getVapidKey,
  seedPushState,
  sendTestPush,
  subscribePush,
  unsubscribePush,
  updatePushPreferences,
} from './resolvers/push';
import { apiPath, mockResultResponse } from './utils';

/** MSW's single push state; the `/api/v1` route keeps one per mock session. */
let pushState = seedPushState();

export function resetMockPushState() {
  pushState = seedPushState();
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const pushHandlers = [
  http.get(apiPath('/push/vapid-key'), () => mockResultResponse(getVapidKey())),
  http.get(apiPath('/push/preferences'), () => mockResultResponse(getPushPreferences(pushState))),
  http.patch(apiPath('/push/preferences'), async ({ request }) =>
    mockResultResponse(updatePushPreferences(pushState, await readJson(request))),
  ),
  http.post(apiPath('/push/subscription'), async ({ request }) =>
    mockResultResponse(subscribePush(pushState, await readJson(request))),
  ),
  http.delete(apiPath('/push/subscription'), ({ request }) =>
    mockResultResponse(
      unsubscribePush(pushState, new URL(request.url).searchParams.get('endpoint')),
    ),
  ),
  http.post(apiPath('/push/send-test'), () => mockResultResponse(sendTestPush(pushState))),
];
