import type { Cart } from '@/lib/api/schemas';

export function apiPath(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `*/${normalized}`;
}

/**
 * Runtime shape of the shared mock cart (`globalThis.__tokoCartMock`).
 * Extends the internal Cart with the promo state the mock persists between
 * requests. `voucher` mirrors the backend contract: the applied code, or null.
 */
export type MockCart = Cart & {
  discount?: number;
  voucher?: string | null;
};
