import { http } from 'msw';

import { subscribeNewsletter } from './resolvers/newsletter';
import { apiPath, mockResultResponse } from './utils';

/** MSW's subscriber list; the `/api/v1` route keeps one per mock session. */
export const mockNewsletterSubscribers = new Set<string>();

export function resetMockNewsletter() {
  mockNewsletterSubscribers.clear();
}

export const newsletterHandlers = [
  http.post(apiPath('/newsletter/subscribe'), async ({ request }) => {
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      // An unparseable body is answered like the backend: 400 INVALID_BODY.
    }
    return mockResultResponse(subscribeNewsletter(mockNewsletterSubscribers, body));
  }),
];
