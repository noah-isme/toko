import { useCallback, useMemo, useRef } from 'react';

import { AbortError, ApiClientError, NetworkError } from '@/lib/api/apiClient';

/** Header the API reads for optional write idempotency (`internal/common/idempotency.go`). */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

/** Error code the API returns when an `Idempotency-Key` was already seen within its TTL. */
export const IDEMPOTENT_REPLAY_CODE = 'IDEMPOTENT_REPLAY';

export function createIdempotencyKey(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  // RFC 4122 v4 from random bytes for browsers without randomUUID (non-secure contexts).
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Request headers carrying `key`, or none when no key is given. */
export function idempotencyHeaders(key?: string): Record<string, string> {
  return key ? { [IDEMPOTENCY_HEADER]: key } : {};
}

/**
 * Whether a retry of the failed request should reuse its key: only when no response arrived
 * (network failure / abort), so the server may or may not have processed it. Any server response
 * settles the action and the next attempt gets a fresh key.
 */
export function shouldReuseIdempotencyKey(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof AbortError;
}

export function isIdempotentReplay(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === IDEMPOTENT_REPLAY_CODE;
}

/**
 * One idempotency key per user action. `getKey(scope)` returns the pending key, or a new one when
 * none is pending or the action's `scope` (e.g. the submitted payload) changed. Call `settle(error)`
 * when the request finishes: the key is kept for a retry only after a network failure.
 */
export function useIdempotencyKey() {
  const pendingRef = useRef<{ key: string; scope: string } | null>(null);

  const getKey = useCallback((scope = '') => {
    if (!pendingRef.current || pendingRef.current.scope !== scope) {
      pendingRef.current = { key: createIdempotencyKey(), scope };
    }
    return pendingRef.current.key;
  }, []);

  const settle = useCallback((error?: unknown) => {
    if (error === undefined || !shouldReuseIdempotencyKey(error)) {
      pendingRef.current = null;
    }
  }, []);

  return useMemo(() => ({ getKey, settle }), [getKey, settle]);
}
