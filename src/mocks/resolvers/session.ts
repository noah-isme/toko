import type { AdminOrderDetail, AdminProductDetail } from '@/lib/api/services/admin';

export type AdminStore = {
  products: AdminProductDetail[];
  orders: AdminOrderDetail[];
  /** Counter for ids of products created in this session. */
  created: number;
};

type MockState = {
  paidOrdersBySession: Map<string, Set<string>>;
  adminBySession: Map<string, AdminStore>;
};

const store = globalThis as typeof globalThis & { __tokoMockState?: MockState };

/**
 * Per-session mock state. It lives on globalThis so dev-server module reloads
 * keep it and the route handler and in-process server calls share it.
 * Sessions are keyed by the `mockSessionId` cookie: parallel Playwright workers
 * each get their own state instead of fighting over one process-wide value.
 */
export function mockState(): MockState {
  store.__tokoMockState ??= { paidOrdersBySession: new Map(), adminBySession: new Map() };
  return store.__tokoMockState;
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
