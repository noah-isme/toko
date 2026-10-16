import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsKeys } from './keys';

import { notificationsApi } from '@/lib/api/services/notifications';

export function useNotifications(
  page: number = 1,
  limit: number = 20,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: notificationsKeys.list(page),
    queryFn: () => notificationsApi.list(page, limit),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUnreadNotificationCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // poll for near-real-time badge
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
