/**
 * Keeps the admin UI's view of the user's permissions current. A role change
 * takes effect on the backend with the next request, so when an admin query or
 * mutation is refused with 403 the cached `/auth/me` is probably stale: re-read
 * it (throttled) so the nav and page gates catch up without a reload.
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { forbiddenInfo } from '@/entities/admin/access';

/** Minimum gap between two permission refreshes. */
export const PERMISSION_REFRESH_INTERVAL_MS = 30_000;

export function AdminPermissionSync() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const lastRefresh = useRef(0);
  const refreshRef = useRef(refreshUser);

  useEffect(() => {
    refreshRef.current = refreshUser;
  }, [refreshUser]);

  useEffect(() => {
    const onError = (error: unknown) => {
      if (!forbiddenInfo(error)) return;
      const now = Date.now();
      if (now - lastRefresh.current < PERMISSION_REFRESH_INTERVAL_MS) return;
      lastRefresh.current = now;
      void refreshRef.current();
    };

    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return;
      if (event.query.queryKey[0] !== 'admin') return;
      onError(event.action.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return;
      onError(event.action.error);
    });

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);

  return null;
}
