'use client';

import { useMemo } from 'react';

import { getAdminAccess, type AdminAccess } from './access';

import { useAuth } from '@/components/providers/AuthProvider';

/** Admin access of the signed-in user, recomputed when `/auth/me` changes. */
export function useAdminAccess(): AdminAccess {
  const { user } = useAuth();
  return useMemo(() => getAdminAccess(user), [user]);
}
