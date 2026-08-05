'use client';

import { Bell, CheckCheck } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LazyWrapper, LazyPushPreferencesCard } from '@/components/lazy-components';
import { Button } from '@/components/ui/button';
import {
  formatDateTime,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api';
import type { Notification } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/shared/ui/EmptyState';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

const PAGE_SIZE = 20;

function notificationHref(notification: Notification): string {
  const orderId = notification.data?.orderId;
  return orderId ? `/account/orders/${orderId}` : '/account/notifications';
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { data, isLoading, error } = useNotifications(page, PAGE_SIZE);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const totalItems = data?.pagination.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasUnread = notifications.some((n) => !n.read);

  const handleOpen = (notification: Notification) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const href = notificationHref(notification);
    if (href !== '/account/notifications') {
      router.push(href as Route);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notifikasi</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <BaseSkeleton className="mb-2 h-5 w-1/3" />
              <BaseSkeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        <p>Gagal memuat notifikasi.</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <EmptyState
          icon={<Bell aria-hidden="true" />}
          title="Belum ada notifikasi"
          description="Notifikasi tentang status pesanan dan pengiriman Anda akan muncul di sini."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LazyWrapper>
        <LazyPushPreferencesCard />
      </LazyWrapper>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground">Pembaruan pesanan dan akun Anda.</p>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5"
          >
            <CheckCheck aria-hidden="true" className="h-4 w-4" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      <ul className="grid gap-3">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => handleOpen(notification)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !notification.read && 'border-primary/30 bg-primary/5',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                  notification.read ? 'bg-transparent' : 'bg-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', notification.read ? 'font-medium' : 'font-semibold')}>
                  {notification.title}
                </p>
                <p className="text-sm text-muted-foreground">{notification.body}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
