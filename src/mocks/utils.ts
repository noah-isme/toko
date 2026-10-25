import { HttpResponse } from 'msw';

import { MOCK_SESSION_COOKIE } from './fixtures';
import type { MockResult } from './resolvers/types';

import type { CartView } from '@/lib/api/schemas';

export function apiPath(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `*/${normalized}`;
}

/** Fallback mock session for MSW requests made without the session cookie. */
export const MSW_SESSION = 'msw';

/**
 * The `/api/v1` route keys per-session mock stores by the `mockSessionId`
 * cookie; MSW handlers reuse it (they run in the page, so `document.cookie` is
 * readable) so both mock layers share one browser session's state.
 */
export function mockSessionId(request: Request): string {
  const cookies = [
    request.headers.get('cookie') ?? '',
    typeof document === 'undefined' ? '' : document.cookie,
  ].join('; ');
  const match = new RegExp(`(?:^|;\\s*)${MOCK_SESSION_COOKIE}=([^;]+)`).exec(cookies);
  return match ? decodeURIComponent(match[1]) : MSW_SESSION;
}

/**
 * Turns a shared resolver result into an MSW response with the same rules the
 * `/api/v1` route applies: a numeric top-level `status` is the HTTP status and
 * is stripped from the body, and 204 carries no body.
 */
export function mockResultResponse(result: MockResult) {
  if (!Array.isArray(result) && typeof result.status === 'number') {
    const { status, ...rest } = result;
    if (status === 204) return new HttpResponse(null, { status });
    return HttpResponse.json(rest, { status });
  }
  return HttpResponse.json(result);
}

/**
 * Runtime shape of the shared mock cart (`globalThis.__tokoCartMock`).
 * Extends the frontend CartView with the promo state the mock persists between
 * requests. `voucher` mirrors the backend contract: the applied code, or null.
 */
export type MockCart = CartView & {
  discount?: number;
  voucher?: string | null;
};
