/**
 * Staff RBAC shapes (`/admin/roles`, `/admin/staff`). Role and permission
 * slugs are the lowercase identifiers the backend documents in openapi.yaml.
 */

/** Tenant staff roles in rank order (owner first). `customer` is not a staff role. */
export const STAFF_ROLES = [
  'owner',
  'admin',
  'manager',
  'catalog',
  'fulfillment',
  'support',
  'analyst',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/** Every tenant permission, in the order the UI lists them. */
export const ADMIN_PERMISSIONS = [
  'catalog:read',
  'catalog:write',
  'inventory:read',
  'inventory:write',
  'orders:read',
  'orders:write',
  'returns:read',
  'returns:write',
  'refunds:write',
  'customers:read',
  'support:read',
  'support:write',
  'promotions:read',
  'promotions:write',
  'analytics:read',
  'settings:read',
  'settings:write',
  'staff:read',
  'staff:manage',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type StaffStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export interface StaffMember {
  userId: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  /** Membership creation time. */
  createdAt: string;
  updatedAt: string;
}

export interface RoleDefinition {
  role: StaffRole;
  permissions: AdminPermission[];
}

export interface StaffAssignInput {
  email: string;
  role: StaffRole;
}
