import { http } from 'msw';

import { MOCK_SESSION_COOKIE } from './fixtures';
import { resolveAdmin } from './resolvers/admin';
import { apiPath, mockResultResponse } from './utils';

/** Fallback mock session for the shared admin store when no session cookie exists. */
export const MSW_ADMIN_SESSION = 'msw';

/**
 * The `/api/v1` route keys the admin store by the `mockSessionId` cookie; reuse
 * it (MSW handlers run in the page, so `document.cookie` is readable) so reports
 * reflect admin edits made through the route in the same browser session.
 */
function sessionId(request: Request): string {
  const cookies = [
    request.headers.get('cookie') ?? '',
    typeof document === 'undefined' ? '' : document.cookie,
  ].join('; ');
  const match = new RegExp(`(?:^|;\\s*)${MOCK_SESSION_COOKIE}=([^;]+)`).exec(cookies);
  return match ? decodeURIComponent(match[1]) : MSW_ADMIN_SESSION;
}

/**
 * `GET /admin/reports/*` served by the same resolver as the `/api/v1` route,
 * so MSW and the in-process mock API return identical reports and CSV files.
 */
export const adminReportsHandlers = [
  http.get(apiPath('/admin/reports/:report'), ({ request, params }) => {
    const url = new URL(request.url);
    const result = resolveAdmin({
      path: `admin/reports/${String(params.report)}`,
      method: 'GET',
      body: null,
      sessionId: sessionId(request),
      searchParams: url.searchParams,
      headers: request.headers,
    });
    return mockResultResponse(
      result ?? { status: 404, error: { code: 'NOT_FOUND', message: 'Not Found' } },
    );
  }),
];
