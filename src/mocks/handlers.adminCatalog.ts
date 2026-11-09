import { http, type HttpHandler } from 'msw';

import { MOCK_SESSION_COOKIE } from './fixtures';
import { resolveAdmin } from './resolvers/admin';
import { apiPath, mockResultResponse } from './utils';

/** Fallback mock session for the shared admin store when no session cookie exists. */
export const MSW_ADMIN_CATALOG_SESSION = 'msw';

/**
 * The `/api/v1` route keys the admin store by the `mockSessionId` cookie; reuse
 * it (MSW handlers run in the page, so `document.cookie` is readable) so MSW and
 * the route see the same catalog edits in one browser session.
 */
function sessionId(request: Request): string {
  const cookies = [
    request.headers.get('cookie') ?? '',
    typeof document === 'undefined' ? '' : document.cookie,
  ].join('; ');
  const match = new RegExp(`(?:^|;\\s*)${MOCK_SESSION_COOKIE}=([^;]+)`).exec(cookies);
  return match ? decodeURIComponent(match[1]) : MSW_ADMIN_CATALOG_SESSION;
}

/** Same body shape the `/api/v1` route hands to resolvers (JSON, or multipart `{ fields, files }`). */
async function readBody(request: Request): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'DELETE') return null;
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const fields: Record<string, string> = {};
    const files: Record<string, { name: string; type: string; size: number; text: string }> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') fields[key] = value;
      else {
        files[key] = {
          name: value.name,
          type: value.type,
          size: value.size,
          text: await value.text(),
        };
      }
    }
    return { fields, files };
  }
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function delegate(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*?\/api\/v1\//, '').replace(/\/$/, '');
  const result = resolveAdmin({
    path,
    method: request.method,
    body: await readBody(request),
    sessionId: sessionId(request),
    searchParams: url.searchParams,
    headers: request.headers,
  });
  return mockResultResponse(
    result ?? { status: 404, error: { code: 'NOT_FOUND', message: 'Not Found' } },
  );
}

const route = (method: 'get' | 'post' | 'patch', path: string): HttpHandler =>
  http[method](apiPath(path), ({ request }) => delegate(request));

/**
 * Admin catalog operations served by the same resolver as the `/api/v1` route
 * (product list filters/sort, product detail with status and threshold, bulk
 * updates, CSV export/import, inventory, settings and the overview counts).
 */
export const adminCatalogHandlers: HttpHandler[] = [
  route('get', '/admin/products/export'),
  route('post', '/admin/products/import'),
  route('post', '/admin/products/bulk/:kind'),
  route('get', '/admin/products'),
  route('get', '/admin/products/:id'),
  route('patch', '/admin/products/:id'),
  route('get', '/admin/orders/export'),
  route('get', '/admin/inventory'),
  route('patch', '/admin/inventory/:variantId'),
  route('get', '/admin/settings'),
  route('patch', '/admin/settings'),
  route('get', '/admin/analytics/overview'),
];
