export const notificationsKeys = {
  list: (page?: number) => ['notifications', 'list', page] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
};
