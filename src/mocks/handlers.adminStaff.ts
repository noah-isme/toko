import { http } from 'msw';

import { resolveAdmin } from './resolvers/admin';
import type { MockResult } from './resolvers/types';
import { apiPath, mockResultResponse, mockSessionId } from './utils';

const NOT_FOUND: MockResult = { status: 404, error: { code: 'NOT_FOUND', message: 'Not Found' } };

async function viaAdminResolver(request: Request, path: string) {
  const url = new URL(request.url);
  const body = request.method === 'GET' ? null : await request.json().catch(() => null);
  const result = resolveAdmin({
    path,
    method: request.method,
    body,
    sessionId: mockSessionId(request),
    searchParams: url.searchParams,
    headers: request.headers,
  });
  return mockResultResponse(result ?? NOT_FOUND);
}

/**
 * Staff RBAC endpoints served by the same resolver as the `/api/v1` route, so
 * MSW and the in-process mock API share roles, permissions and error codes.
 */
export const adminStaffHandlers = [
  http.get(apiPath('/admin/roles'), ({ request }) => viaAdminResolver(request, 'admin/roles')),
  http.get(apiPath('/admin/staff'), ({ request }) => viaAdminResolver(request, 'admin/staff')),
  http.post(apiPath('/admin/staff'), ({ request }) => viaAdminResolver(request, 'admin/staff')),
  http.patch(apiPath('/admin/staff/:userId'), ({ request, params }) =>
    viaAdminResolver(request, `admin/staff/${String(params.userId)}`),
  ),
  http.delete(apiPath('/admin/staff/:userId'), ({ request, params }) =>
    viaAdminResolver(request, `admin/staff/${String(params.userId)}`),
  ),
];
