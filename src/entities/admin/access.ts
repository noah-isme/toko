/**
 * Admin access model: what the signed-in user may see in the admin area.
 *
 * Tenant-scoped areas are gated on the `permissions` that `GET /auth/me`
 * returns for the caller's role in the current tenant. Platform-global areas
 * (webhooks, audit logs) sit outside that matrix: they need the legacy global
 * `roles` to contain `admin` in addition to a staff role in the tenant (the
 * backend mounts them behind `RequireStaff`). This is UX gating only: the
 * backend enforces the same rules on every admin request.
 */
import {
  ADMIN_PERMISSIONS,
  STAFF_ROLES,
  type AdminPermission,
  type StaffRole,
} from './types/staff';

import { ApiClientError } from '@/lib/api/apiClient';
import type { User } from '@/lib/api/types';

/** Pseudo-permission for the platform-global admin areas. */
export const PLATFORM_ADMIN = 'platform-admin' as const;

export type AdminRequirement = AdminPermission | typeof PLATFORM_ADMIN;

export interface AdminAccess {
  /** The user may enter the admin area at all (any staff role, or platform admin). */
  canEnter: boolean;
  isPlatformAdmin: boolean;
  /** Tenant role from `/auth/me`; `null` when unknown or not a staff role. */
  role: StaffRole | null;
  can: (requirement: AdminRequirement | null | undefined) => boolean;
}

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS);

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === 'string' && PERMISSION_SET.has(value);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

/** Exact match, like the backend's `slices.Contains(user.Roles, "admin")`. */
function hasGlobalAdminRole(user: User | null | undefined): boolean {
  return Boolean(user?.roles?.includes('admin'));
}

/**
 * Derives the admin access of `user`. When `/auth/me` reports `permissions`,
 * the platform areas also need a staff role in the tenant, as on the backend.
 * A payload without `permissions` (an older backend, or a cached login
 * response) falls back to the legacy rule: a global `admin` holds every
 * permission and everyone else holds none.
 */
export function getAdminAccess(user: User | null | undefined): AdminAccess {
  const role = isStaffRole(user?.role) ? user.role : null;
  const hasPermissionList = Array.isArray(user?.permissions);
  const isPlatformAdmin = hasGlobalAdminRole(user) && (!hasPermissionList || role !== null);
  const granted = new Set<AdminPermission>(
    hasPermissionList
      ? (user?.permissions ?? []).filter(isAdminPermission)
      : isPlatformAdmin
        ? ADMIN_PERMISSIONS
        : [],
  );

  return {
    canEnter: Boolean(user) && (granted.size > 0 || isPlatformAdmin),
    isPlatformAdmin,
    role,
    can: (requirement) => {
      if (!requirement) return true;
      if (requirement === PLATFORM_ADMIN) return isPlatformAdmin;
      return granted.has(requirement);
    },
  };
}

/**
 * Permission each admin page needs, matched against the pathname. Patterns are
 * checked in order, so the more specific `new`/`edit` routes come first. Pages
 * not listed here (none today) are open to every staff member.
 */
const ADMIN_ROUTE_REQUIREMENTS: ReadonlyArray<{ pattern: RegExp; requirement: AdminRequirement }> =
  [
    { pattern: /^\/admin\/?$/, requirement: 'analytics:read' },
    { pattern: /^\/admin\/products\/(new|[^/]+\/edit)\/?$/, requirement: 'catalog:write' },
    { pattern: /^\/admin\/(products|categories|brands)(\/|$)/, requirement: 'catalog:read' },
    { pattern: /^\/admin\/inventory(\/|$)/, requirement: 'inventory:read' },
    { pattern: /^\/admin\/customers(\/|$)/, requirement: 'customers:read' },
    { pattern: /^\/admin\/orders(\/|$)/, requirement: 'orders:read' },
    { pattern: /^\/admin\/flash-sales\/(new|[^/]+\/edit)\/?$/, requirement: 'promotions:write' },
    { pattern: /^\/admin\/(vouchers|flash-sales)(\/|$)/, requirement: 'promotions:read' },
    { pattern: /^\/admin\/returns(\/|$)/, requirement: 'returns:read' },
    { pattern: /^\/admin\/support(\/|$)/, requirement: 'support:read' },
    { pattern: /^\/admin\/analytics(\/|$)/, requirement: 'analytics:read' },
    { pattern: /^\/admin\/settings(\/|$)/, requirement: 'settings:read' },
    { pattern: /^\/admin\/staff(\/|$)/, requirement: 'staff:read' },
    { pattern: /^\/admin\/(webhooks|audit-logs)(\/|$)/, requirement: PLATFORM_ADMIN },
  ];

/** The requirement for an admin pathname, or `null` when the page is open to all staff. */
export function requirementForPath(pathname: string): AdminRequirement | null {
  return (
    ADMIN_ROUTE_REQUIREMENTS.find(({ pattern }) => pattern.test(pathname))?.requirement ?? null
  );
}

/** Error codes the backend uses for a 403 on admin routes. */
export type AdminForbiddenCode = 'FORBIDDEN' | 'TENANT_FORBIDDEN' | 'OWNER_REQUIRED';

export interface AdminForbiddenInfo {
  code: AdminForbiddenCode;
  /** `details.required` of a `FORBIDDEN` response: a permission, `staff` or `platform-admin`. */
  required: string | null;
}

const FORBIDDEN_CODES: ReadonlySet<string> = new Set<AdminForbiddenCode>([
  'FORBIDDEN',
  'TENANT_FORBIDDEN',
  'OWNER_REQUIRED',
]);

function isForbiddenCode(code: unknown): code is AdminForbiddenCode {
  return typeof code === 'string' && FORBIDDEN_CODES.has(code);
}

/**
 * Recognises an admin authorization failure. Other 403s (a CSRF failure that
 * survived the API client's retry, for example) return `null` so callers show
 * their normal error state with a retry instead of a "no access" state.
 */
export function forbiddenInfo(error: unknown): AdminForbiddenInfo | null {
  if (!(error instanceof ApiClientError) || error.status !== 403) return null;
  const code = error.code;
  if (!isForbiddenCode(code)) return null;
  const required = error.details?.required;
  return { code, required: typeof required === 'string' ? required : null };
}
