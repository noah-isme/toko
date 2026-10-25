/**
 * Client-side admin gates.
 *
 * These are UX guards, not a security boundary: every `/admin/*` API call is
 * separately authorised by the backend (tenant staff role + permission, or the
 * platform-admin role), so a user who bypasses them still cannot read or mutate
 * admin data.
 *
 * - `AdminGuard` wraps the whole shell: signed-out users go to login, members
 *   without any staff role see a full-screen "admin access required" state.
 * - `AdminRouteGate` wraps the page inside the shell: a staff member without the
 *   page's permission sees the friendly no-access state (the nav stays usable),
 *   and the dashboard sends them to the first section they may open instead.
 */
'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';

import { AdminForbidden } from '@/components/admin/admin-access-ui';
import { accessibleNavItems } from '@/components/admin/admin-nav';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { requirementForPath } from '@/entities/admin/access';
import { useAdminAccess } from '@/entities/admin/use-admin-access';

function CheckingAccess({ fullScreen = false }: { fullScreen?: boolean }) {
  const t = useTranslations('admin.guard');
  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-screen items-center justify-center'
          : 'flex items-center justify-center py-16'
      }
    >
      <p className="text-sm text-muted-foreground" role="status">
        {t('checking')}
      </p>
    </div>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const t = useTranslations('admin.guard');
  const { isLoading, isAuthenticated } = useAuth();
  const access = useAdminAccess();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/admin');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <CheckingAccess fullScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!access.canEnter) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">{t('backToStore')}</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

function isDashboard(pathname: string): boolean {
  return pathname === '/admin' || pathname === '/admin/';
}

export function AdminRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const access = useAdminAccess();
  const requirement = requirementForPath(pathname);
  const allowed = access.can(requirement);
  const redirectTo =
    !allowed && isDashboard(pathname) ? (accessibleNavItems(access)[0]?.href ?? null) : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo as Parameters<typeof router.replace>[0]);
  }, [redirectTo, router]);

  if (allowed) return <>{children}</>;
  if (redirectTo) return <CheckingAccess />;
  return <AdminForbidden required={requirement} />;
}
