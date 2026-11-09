import { ApiClientError, AuthError } from '@/lib/api/apiClient';

export type AlertErrorKind =
  | 'alreadyInStock'
  | 'notFound'
  | 'alertNotFound'
  | 'sessionExpired'
  | 'failed';

/**
 * Maps a failed alert request to a `product.alerts.errors.*` message key. A
 * 404 means "product not found" when subscribing, but "alert already removed"
 * (e.g. in another tab) when deleting: pass `{ action: 'delete' }` there.
 */
export function alertErrorKind(
  error: unknown,
  options: { action?: 'subscribe' | 'delete' } = {},
): AlertErrorKind {
  if (error instanceof AuthError) return 'sessionExpired';
  if (error instanceof ApiClientError) {
    if (error.code === 'ALREADY_IN_STOCK') return 'alreadyInStock';
    if (error.status === 404) return options.action === 'delete' ? 'alertNotFound' : 'notFound';
  }
  return 'failed';
}
