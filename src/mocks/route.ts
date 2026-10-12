/**
 * In-process mock API used by `src/app/api/v1/[[...path]]/route.ts` (and, in
 * mock mode, by server-side fetches). Only import it behind the literal mock
 * gate (see tests/config/mock-gate.test.ts) so production builds drop it.
 */
import { resolveAddress } from './resolvers/address';
import { resolveAdmin } from './resolvers/admin';
import { resolveAuth } from './resolvers/auth';
import { resolveCartRead, resolveCartWrite } from './resolvers/cart';
import { resolveCatalog } from './resolvers/catalog';
import { resolveCheckout } from './resolvers/checkout';
import { resolveNewsletter } from './resolvers/newsletter';
import { resolveNotifications } from './resolvers/notifications';
import { resolveOrders } from './resolvers/orders';
import {
  resolvePaymentInstructions,
  resolvePaymentIntent,
  resolvePaymentStatus,
} from './resolvers/payments';
import { resolveCartPromo, resolveVoucher } from './resolvers/promo';
import { resolvePush } from './resolvers/push';
import type { MockRequest, MockResolver, MockResult } from './resolvers/types';

export { MOCK_ADMIN_TOKEN, MOCK_SESSION_COOKIE } from './fixtures';
export type { MockResult } from './resolvers/types';

/**
 * First match wins, so the order matters: several matchers use substring or
 * prefix tests (`quote/shipping` and `apply-voucher` must run before the
 * generic `carts/*` writes, product sub-resources before product detail).
 */
const RESOLVERS: MockResolver[] = [
  resolveAdmin,
  resolvePaymentStatus,
  resolvePaymentInstructions,
  resolveNotifications,
  resolvePush,
  resolveNewsletter,
  resolveCatalog,
  resolveAddress,
  resolveCartRead,
  resolveCartPromo,
  resolveCheckout,
  resolvePaymentIntent,
  resolveVoucher,
  resolveOrders,
  resolveCartWrite,
  resolveAuth,
];

/**
 * Resolves one mock API request. Returns `null` for unknown routes (the
 * caller answers 404). A numeric `status` on the result is the HTTP status.
 */
export function handleMockRequest(
  path: string,
  method: string,
  body: unknown,
  sessionId: string,
  searchParams: URLSearchParams = new URLSearchParams(),
  req?: { headers: Headers },
): MockResult | null {
  const request: MockRequest = {
    path,
    method,
    body,
    sessionId,
    searchParams,
    headers: req?.headers ?? new Headers(),
  };
  for (const resolve of RESOLVERS) {
    const result = resolve(request);
    if (result !== undefined) return result;
  }
  return null;
}
