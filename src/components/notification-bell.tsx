'use client';

import { Bell, CheckCheck } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  formatDateTime,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/lib/api';
import type { Notification } from '@/lib/api/types';
import { cn } from '@/lib/utils';

/**
 * Resolve the in-app destination for a notification from its `data` payload.
 * Order/shipment notifications carry an `orderId`; everything else falls back
 * to the notifications page.
 */
function notificationHref(notification: Notification): Route {
  const orderId = notification.data?.orderId;
  if (orderId) {
    return `/account/orders/${orderId}` as Route;
  }
  return '/account/notifications' as Route;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const { data: unread } = useUnreadNotificationCount({ enabled: isAuthenticated });
  const { data, isLoading } = useNotifications(1, 8, { enabled: isAuthenticated });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!isAuthenticated) {
    return null;
  }

  const notifications = data?.data ?? [];
  const unreadCount = unread ?? 0;
  const hasUnread = unreadCount > 0;

  const handleOpen = (notification: Notification) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    router.push(notificationHref(notification));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative"
          aria-label={hasUnread ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        >
          <Bell aria-hidden="true" className="h-5 w-5" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifikasi</span>
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Tandai semua dibaca
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onSelect={() => handleOpen(notification)}
                className="flex flex-col items-start gap-0.5 whitespace-normal"
              >
                <div className="flex w-full items-start gap-2">
                  {!notification.read && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                    />
                  )}
                  <div className={cn('min-w-0 flex-1', notification.read && 'pl-4')}>
                    <p
                      className={cn(
                        'truncate text-sm',
                        notification.read ? 'font-normal' : 'font-semibold',
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm font-medium">
          <Link href={'/account/notifications' as Route}>Lihat semua</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
