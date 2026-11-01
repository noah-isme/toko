/**
 * Shared pieces for permission-aware admin UI: localized role and permission
 * labels, the friendly 403 state, and a translator for admin API errors.
 */
'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { accessibleNavItems } from '@/components/admin/admin-nav';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_ADMIN,
  forbiddenInfo,
  isAdminPermission,
  type AdminForbiddenCode,
} from '@/entities/admin/access';
import type { AdminPermission, StaffRole } from '@/entities/admin/types';
import { useAdminAccess } from '@/entities/admin/use-admin-access';

type PermissionLabelKey =
  | 'catalogRead'
  | 'catalogWrite'
  | 'inventoryRead'
  | 'inventoryWrite'
  | 'ordersRead'
  | 'ordersWrite'
  | 'returnsRead'
  | 'returnsWrite'
  | 'refundsWrite'
  | 'customersRead'
  | 'supportRead'
  | 'supportWrite'
  | 'promotionsRead'
  | 'promotionsWrite'
  | 'analyticsRead'
  | 'settingsRead'
  | 'settingsWrite'
  | 'staffRead'
  | 'staffManage';

/** Message key under `admin.access.permissions` for each permission slug. */
const PERMISSION_LABEL_KEYS: Record<AdminPermission, PermissionLabelKey> = {
  'catalog:read': 'catalogRead',
  'catalog:write': 'catalogWrite',
  'inventory:read': 'inventoryRead',
  'inventory:write': 'inventoryWrite',
  'orders:read': 'ordersRead',
  'orders:write': 'ordersWrite',
  'returns:read': 'returnsRead',
  'returns:write': 'returnsWrite',
  'refunds:write': 'refundsWrite',
  'customers:read': 'customersRead',
  'support:read': 'supportRead',
  'support:write': 'supportWrite',
  'promotions:read': 'promotionsRead',
  'promotions:write': 'promotionsWrite',
  'analytics:read': 'analyticsRead',
  'settings:read': 'settingsRead',
  'settings:write': 'settingsWrite',
  'staff:read': 'staffRead',
  'staff:manage': 'staffManage',
};

/**
 * Returns a labeler for a permission slug or a `details.required` value
 * (`staff`, `platform-admin`); unknown values are shown as-is.
 */
export function usePermissionLabel() {
  const t = useTranslations('admin.access.permissions');
  return useCallback(
    (required: string): string => {
      if (isAdminPermission(required)) return t(PERMISSION_LABEL_KEYS[required]);
      if (required === PLATFORM_ADMIN) return t('platformAdmin');
      if (required === 'staff') return t('staff');
      return required;
    },
    [t],
  );
}

export function useRoleLabel() {
  const t = useTranslations('admin.access.roles');
  return useCallback((role: StaffRole): string => t(role), [t]);
}

/**
 * Friendly "no access" state for a page or a section of one. `required` is the
 * missing permission (or `platform-admin`) when known.
 */
export function AdminForbidden({
  required,
  code = 'FORBIDDEN',
}: {
  required?: string | null;
  code?: AdminForbiddenCode;
}) {
  const t = useTranslations('admin.access');
  const tNav = useTranslations('admin.nav.items');
  const permissionLabel = usePermissionLabel();
  const access = useAdminAccess();
  const pathname = usePathname();
  // Never offer a link back to the page that just refused access, and offer
  // none at all when the user lacks a staff role (every admin page needs one).
  const fallback =
    required === 'staff'
      ? undefined
      : accessibleNavItems(access).find((item) => item.href !== pathname);

  let description: string;
  if (code === 'TENANT_FORBIDDEN') description = t('tenantDescription');
  else if (code === 'OWNER_REQUIRED') description = t('ownerRequired');
  else if (required === PLATFORM_ADMIN) description = t('platformDescription');
  else if (required && required !== 'staff') {
    description = t('description', { permission: permissionLabel(required) });
  } else description = t('descriptionGeneric');

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg border bg-background px-6 py-16 text-center"
      role="alert"
      data-testid="admin-forbidden"
    >
      <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {fallback && code !== 'TENANT_FORBIDDEN' ? (
        <Button asChild variant="outline">
          <Link href={fallback.href as Parameters<typeof Link>[0]['href']}>
            {t('goTo', { section: tNav(fallback.labelKey) })}
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link href="/">{t('backToStore')}</Link>
        </Button>
      )}
    </div>
  );
}

/**
 * Returns `(error, fallback) => message` for admin toasts: authorization
 * failures get localized copy (naming the missing permission when the backend
 * reports it), other errors keep their message, and non-errors use `fallback`.
 * With `preferFallback`, every non-authorization error uses `fallback`.
 */
export function useAdminErrorMessage({
  preferFallback = false,
}: { preferFallback?: boolean } = {}) {
  const t = useTranslations('admin.access');
  const permissionLabel = usePermissionLabel();
  return useCallback(
    (error: unknown, fallback: string): string => {
      const info = forbiddenInfo(error);
      if (info) {
        if (info.code === 'TENANT_FORBIDDEN') return t('tenantForbidden');
        if (info.code === 'OWNER_REQUIRED') return t('ownerRequired');
        if (info.required === PLATFORM_ADMIN) return t('platformOnly');
        if (info.required && info.required !== 'staff') {
          return t('actionForbidden', { permission: permissionLabel(info.required) });
        }
        return t('actionForbiddenGeneric');
      }
      if (!preferFallback && error instanceof Error && error.message) return error.message;
      return fallback;
    },
    [t, permissionLabel, preferFallback],
  );
}
