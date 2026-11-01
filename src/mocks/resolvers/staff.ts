/**
 * Staff RBAC mock: the role -> permission matrix, the permission each admin
 * route needs, and a per-session staff store behind `/admin/roles` and
 * `/admin/staff`. Mirrors toko-api `internal/rbac` (roles.go, handlers.go):
 * same error codes, owner-only rules and last-owner protection.
 */
import { MOCK_USER } from '../factories/user';
import { users } from '../fixtures';

import { sessionValue } from './session';
import type { MockRequest, MockResult } from './types';

import {
  ADMIN_PERMISSIONS,
  STAFF_ROLES,
  type AdminPermission,
  type RoleDefinition,
  type StaffMember,
  type StaffRole,
} from '@/entities/admin/types/staff';

export type MockTenantRole = StaffRole | 'customer';

const without = (...drop: AdminPermission[]) =>
  ADMIN_PERMISSIONS.filter((permission) => !drop.includes(permission));

/** The static product policy (backend `rolePermissions`). */
export const ROLE_PERMISSIONS: Record<MockTenantRole, readonly AdminPermission[]> = {
  owner: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  manager: without('settings:write', 'staff:manage'),
  catalog: [
    'catalog:read',
    'catalog:write',
    'inventory:read',
    'inventory:write',
    'promotions:read',
  ],
  fulfillment: [
    'orders:read',
    'orders:write',
    'returns:read',
    'returns:write',
    'inventory:read',
    'customers:read',
  ],
  support: [
    'support:read',
    'support:write',
    'orders:read',
    'returns:read',
    'returns:write',
    'customers:read',
  ],
  analyst: ['analytics:read', 'orders:read', 'catalog:read', 'promotions:read', 'customers:read'],
  customer: [],
};

/** Sorted permissions of `role`, as `/auth/me` and `/admin/roles` send them. */
export function permissionsFor(role: MockTenantRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]].sort();
}

export function isStaffRoleSlug(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);
}

const READ_WRITE: Record<string, [AdminPermission, AdminPermission]> = {
  products: ['catalog:read', 'catalog:write'],
  categories: ['catalog:read', 'catalog:write'],
  brands: ['catalog:read', 'catalog:write'],
  inventory: ['inventory:read', 'inventory:write'],
  orders: ['orders:read', 'orders:write'],
  returns: ['returns:read', 'returns:write'],
  customers: ['customers:read', 'customers:read'],
  newsletter: ['customers:read', 'customers:read'],
  support: ['support:read', 'support:write'],
  vouchers: ['promotions:read', 'promotions:write'],
  'flash-sales': ['promotions:read', 'promotions:write'],
  analytics: ['analytics:read', 'analytics:read'],
  settings: ['settings:read', 'settings:write'],
  onboarding: ['settings:write', 'settings:write'],
  staff: ['staff:read', 'staff:manage'],
  roles: ['staff:read', 'staff:read'],
};

const PLATFORM_SEGMENTS = new Set(['webhooks', 'webhook-deliveries', 'queue', 'audit-logs']);

/**
 * Permission an `admin/*` request needs (backend "Permission required per
 * existing admin route" table); `null` for paths outside the table.
 */
export function adminRoutePermission(
  parts: string[],
  method: string,
): AdminPermission | 'platform-admin' | null {
  const [resource] = parts;
  if (PLATFORM_SEGMENTS.has(resource)) return 'platform-admin';
  if (resource === 'products' && parts[2] === 'stock') return 'inventory:write';
  if (resource === 'returns' && parts[2] === 'refund') return 'refunds:write';
  if (resource === 'vouchers' && parts[1] === 'preview') return 'promotions:read';
  const pair = READ_WRITE[resource];
  if (!pair) return null;
  return method === 'GET' ? pair[0] : pair[1];
}

type Membership = StaffMember | (Omit<StaffMember, 'role'> & { role: 'customer' });

const SEED_ROLES: Record<string, StaffRole> = {
  'admin@toko.com': 'admin',
  'noah@toko.com': 'manager',
  'budi@example.com': 'support',
  'siti@example.com': 'catalog',
};

function timestamp(index: number): string {
  return new Date(Date.UTC(2026, 0, 5 + index, 8)).toISOString();
}

/**
 * Every member of the mock tenant: the signed-in user with the role their
 * token names, seeded staff, customers. When the signed-in user is not the
 * owner, `admin@toko.com` is, so the tenant always has an owner.
 */
function seedMemberships(selfRole: MockTenantRole): Membership[] {
  const self: Membership = {
    userId: MOCK_USER.id,
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    role: selfRole,
    status: 'ACTIVE',
    createdAt: timestamp(0),
    updatedAt: timestamp(0),
  };
  const seedRole = (email: string): MockTenantRole =>
    selfRole !== 'owner' && email === 'admin@toko.com'
      ? 'owner'
      : (SEED_ROLES[email] ?? 'customer');
  return [
    self,
    ...users.map(
      (user, index): Membership => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: seedRole(user.email),
        status: 'ACTIVE',
        createdAt: timestamp(index + 1),
        updatedAt: timestamp(index + 1),
      }),
    ),
  ];
}

/**
 * The session's tenant as seen by a signed-in user whose token names
 * `tokenRole`. Each token role gets its own store, so switching mock tokens
 * starts from a consistent tenant instead of one where the token and the
 * stored role disagree.
 */
function memberships(sessionId: string, tokenRole: MockTenantRole): Membership[] {
  return sessionValue(`staff:${tokenRole}`, sessionId, () => seedMemberships(tokenRole));
}

/**
 * The signed-in user's current tenant role: the role their token names until a
 * staff change in this session moves it (a self demotion or revoke), as the
 * backend's `/auth/me` and permission checks read the role per request.
 */
export function effectiveTenantRole(sessionId: string, tokenRole: MockTenantRole): MockTenantRole {
  if (tokenRole === 'customer') return tokenRole;
  const self = memberships(sessionId, tokenRole).find((member) => member.userId === MOCK_USER.id);
  return self?.role ?? tokenRole;
}

const rank = (role: StaffRole) => STAFF_ROLES.indexOf(role);

function isStaff(member: Membership): member is StaffMember {
  return member.role !== 'customer';
}

function error(status: number, code: string, message: string): MockResult {
  return { status, error: { code, message } };
}

const STAFF_NOT_FOUND = error(404, 'STAFF_NOT_FOUND', 'staff member not found');
const OWNER_REQUIRED = error(
  403,
  'OWNER_REQUIRED',
  'only an owner can grant or change the owner role',
);
const LAST_OWNER = error(409, 'LAST_OWNER', 'the tenant must keep at least one active owner');

function activeOwners(all: Membership[]): number {
  return all.filter((member) => member.role === 'owner' && member.status === 'ACTIVE').length;
}

function listStaff(all: Membership[], searchParams: URLSearchParams): MockResult {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const staff = all
    .filter(isStaff)
    .sort((a, b) => rank(a.role) - rank(b.role) || a.email.localeCompare(b.email));
  const start = (page - 1) * perPage;
  return {
    data: staff.slice(start, start + perPage),
    pagination: { page, perPage, totalItems: staff.length },
  };
}

/**
 * `admin/roles` and `admin/staff[/{userId}]` for an actor whose permission the
 * caller has already checked. `actorRole` is the actor's current role and
 * `tokenRole` the role their token names (it selects the store). Returns
 * `undefined` for other paths.
 */
export function resolveStaff(
  req: MockRequest,
  parts: string[],
  actorRole: MockTenantRole,
  tokenRole: MockTenantRole = actorRole,
): MockResult | undefined {
  const { method, body, sessionId, searchParams } = req;

  if (parts.length === 1 && parts[0] === 'roles' && method === 'GET') {
    const data: RoleDefinition[] = STAFF_ROLES.map((role) => ({
      role,
      permissions: permissionsFor(role),
    }));
    return { data };
  }
  if (parts[0] !== 'staff') return undefined;

  const all = memberships(sessionId, tokenRole);
  const now = new Date().toISOString();

  if (parts.length === 1 && method === 'GET') return listStaff(all, searchParams);

  if (parts.length === 1 && method === 'POST') {
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@')) {
      return error(400, 'VALIDATION_ERROR', 'a valid email is required');
    }
    if (!isStaffRoleSlug(body?.role)) {
      return error(400, 'VALIDATION_ERROR', 'role must be one of the staff roles');
    }
    if (body.role === 'owner' && actorRole !== 'owner') return OWNER_REQUIRED;
    const target = all.find((member) => member.email.toLowerCase() === email.toLowerCase());
    if (!target) return error(404, 'USER_NOT_FOUND', 'no member of this tenant has that email');
    if (isStaff(target)) {
      return error(409, 'STAFF_EXISTS', 'user is already staff; change the role instead');
    }
    Object.assign(target, { role: body.role, status: 'ACTIVE', updatedAt: now });
    return { status: 201, data: target };
  }

  if (parts.length !== 2 || (method !== 'PATCH' && method !== 'DELETE')) return undefined;
  // Like the backend, PATCH validates the payload before looking up the target.
  const role = body?.role;
  if (method === 'PATCH' && !isStaffRoleSlug(role)) {
    return error(
      400,
      'VALIDATION_ERROR',
      'role must be one of the staff roles; use DELETE to revoke',
    );
  }
  const target = all.find((member) => member.userId === parts[1]);
  if (!target || !isStaff(target)) return STAFF_NOT_FOUND;

  if (method === 'PATCH') {
    if ((target.role === 'owner' || role === 'owner') && actorRole !== 'owner') {
      return OWNER_REQUIRED;
    }
    if (
      target.role === 'owner' &&
      target.status === 'ACTIVE' &&
      role !== 'owner' &&
      activeOwners(all) <= 1
    ) {
      return LAST_OWNER;
    }
    Object.assign(target, { role, updatedAt: now });
    return { data: target };
  }

  if (method === 'DELETE') {
    if (target.role === 'owner' && actorRole !== 'owner') return OWNER_REQUIRED;
    if (target.role === 'owner' && target.status === 'ACTIVE' && activeOwners(all) <= 1) {
      return LAST_OWNER;
    }
    Object.assign(target, { role: 'customer', updatedAt: now });
    return { status: 204 };
  }
  return undefined;
}
