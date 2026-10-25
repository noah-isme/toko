import { ApiClientError, AuthError } from '@/lib/api/apiClient';

export type AlertErrorKind = 'alreadyInStock' | 'notFound' | 'sessionExpired' | 'failed';

/** Maps a failed alert request to a `product.alerts.errors.*` message key. */
export function alertErrorKind(error: unknown): AlertErrorKind {
  if (error instanceof AuthError) return 'sessionExpired';
  if (error instanceof ApiClientError) {
    if (error.code === 'ALREADY_IN_STOCK') return 'alreadyInStock';
    if (error.status === 404) return 'notFound';
  }
  return 'failed';
}
