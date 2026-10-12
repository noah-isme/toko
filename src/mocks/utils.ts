import { HttpResponse } from 'msw';

import type { MockResult } from './resolvers/types';

import type { CartView } from '@/lib/api/schemas';

export function apiPath(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `*/${normalized}`;
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
