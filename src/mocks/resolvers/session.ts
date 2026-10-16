import type { AdminOrderDetail, AdminProductDetail } from '@/entities/admin/types';

export type AdminStore = {
  products: AdminProductDetail[];
  orders: AdminOrderDetail[];
  /** Counter for ids of products created in this session. */
  created: number;
};

type MockState = {
  paidOrdersBySession: Map<string, Set<string>>;
  adminBySession: Map<string, AdminStore>;
  /** Other per-session values, keyed by bucket name (see `sessionValue`). */
  buckets: Map<string, Map<string, unknown>>;
};

const store = globalThis as typeof globalThis & { __tokoMockState?: MockState };

/**
 * Per-session mock state. It lives on globalThis so dev-server module reloads
 * keep it and the route handler and in-process server calls share it.
 * Sessions are keyed by the `mockSessionId` cookie: parallel Playwright workers
 * each get their own state instead of fighting over one process-wide value.
 */
export function mockState(): MockState {
  store.__tokoMockState ??= {
    paidOrdersBySession: new Map(),
    adminBySession: new Map(),
    buckets: new Map(),
  };
  // A dev-server reload can keep state created by an older shape of this module.
  store.__tokoMockState.buckets ??= new Map();
  return store.__tokoMockState;
}

/**
 * The session's value in `bucket`, created with `seed()` on first use. Callers
 * mutate the returned value in place, so `seed` must return a fresh object.
 */
export function sessionValue<T>(bucket: string, sessionId: string, seed: () => T): T {
  const { buckets } = mockState();
  let values = buckets.get(bucket);
  if (!values) {
    values = new Map();
    buckets.set(bucket, values);
  }
  if (!values.has(sessionId)) values.set(sessionId, seed());
  return values.get(sessionId) as T;
}

export function paidOrders(sessionId: string): Set<string> {
  const { paidOrdersBySession } = mockState();
  let orders = paidOrdersBySession.get(sessionId);
  if (!orders) {
    orders = new Set<string>();
    paidOrdersBySession.set(sessionId, orders);
  }
  return orders;
}

/** The session's admin store, seeded on first use with a deep copy of `seed()`. */
export function adminStore(sessionId: string, seed: () => Omit<AdminStore, 'created'>): AdminStore {
  const { adminBySession } = mockState();
  let admin = adminBySession.get(sessionId);
  if (!admin) {
    admin = { ...structuredClone(seed()), created: 0 };
    adminBySession.set(sessionId, admin);
  }
  return admin;
}

/** Drops all per-session state (tests only). */
export function resetMockState(): void {
  delete store.__tokoMockState;
}
