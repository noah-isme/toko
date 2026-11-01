import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api';
import { adminKeys } from '../keys';
import type { StaffAssignInput, StaffRole } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

/** The role matrix never changes at runtime; fetch it once per session. */
export function useAdminRoles(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminKeys.roles(),
    queryFn: () => adminApi.getRoles(),
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  });
}

export function useAdminStaff(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: adminKeys.staff(params),
    queryFn: () => adminApi.getStaff(params),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

/**
 * Staff mutations refetch the list whether they succeed or fail: a 404/409
 * means the list on screen is stale (someone else changed it).
 */
function useStaffMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.staffAll() });
    },
  });
}

export function useAssignAdminStaff() {
  return useStaffMutation((input: StaffAssignInput) => adminApi.assignStaff(input));
}

export function useUpdateAdminStaffRole() {
  return useStaffMutation(({ userId, role }: { userId: string; role: StaffRole }) =>
    adminApi.updateStaffRole(userId, role),
  );
}

export function useRevokeAdminStaff() {
  return useStaffMutation((userId: string) => adminApi.revokeStaff(userId));
}
