import { describe, expect, it } from 'vitest';

import {
  PLATFORM_ADMIN,
  forbiddenInfo,
  getAdminAccess,
  requirementForPath,
} from '@/entities/admin/access';
import { ApiClientError } from '@/lib/api/apiClient';
import type { User } from '@/lib/api/types';

const base: User = { id: 'u1', name: 'Jane', email: 'jane@shop.id', createdAt: '2026-01-01' };

describe('getAdminAccess', () => {
  it('denies everything to signed-out users and customers', () => {
    expect(getAdminAccess(null).canEnter).toBe(false);
    const customer = getAdminAccess({
      ...base,
      roles: ['customer'],
      role: 'customer',
      permissions: [],
    });
    expect(customer.canEnter).toBe(false);
    expect(customer.role).toBeNull();
    expect(customer.can('catalog:read')).toBe(false);
    expect(customer.can(null)).toBe(true);
  });

  it('grants exactly the permissions /auth/me reports for the tenant role', () => {
    const access = getAdminAccess({
      ...base,
      roles: ['customer'],
      role: 'catalog',
      permissions: ['catalog:read', 'catalog:write', 'not-a-permission'],
    });
    expect(access.canEnter).toBe(true);
    expect(access.role).toBe('catalog');
    expect(access.isPlatformAdmin).toBe(false);
    expect(access.can('catalog:write')).toBe(true);
    expect(access.can('orders:read')).toBe(false);
    expect(access.can(PLATFORM_ADMIN)).toBe(false);
  });

  it('gates platform areas on the legacy global admin role only', () => {
    const owner = getAdminAccess({
      ...base,
      roles: ['customer'],
      role: 'owner',
      permissions: ['staff:manage'],
    });
    expect(owner.can(PLATFORM_ADMIN)).toBe(false);
    const platform = getAdminAccess({ ...base, roles: ['Admin'], role: 'admin', permissions: [] });
    expect(platform.canEnter).toBe(true);
    expect(platform.can(PLATFORM_ADMIN)).toBe(true);
    expect(platform.can('catalog:read')).toBe(false);
  });

  it('falls back to the legacy rule when permissions are missing', () => {
    expect(getAdminAccess({ ...base, roles: ['admin'] }).can('staff:manage')).toBe(true);
    expect(getAdminAccess({ ...base, roles: ['customer'] }).canEnter).toBe(false);
  });
});

describe('requirementForPath', () => {
  it.each([
    ['/admin', 'analytics:read'],
    ['/admin/products', 'catalog:read'],
    ['/admin/products/new', 'catalog:write'],
    ['/admin/products/abc/edit', 'catalog:write'],
    ['/admin/categories', 'catalog:read'],
    ['/admin/brands', 'catalog:read'],
    ['/admin/inventory', 'inventory:read'],
    ['/admin/customers', 'customers:read'],
    ['/admin/orders', 'orders:read'],
    ['/admin/vouchers', 'promotions:read'],
    ['/admin/flash-sales', 'promotions:read'],
    ['/admin/flash-sales/new', 'promotions:write'],
    ['/admin/flash-sales/9/edit', 'promotions:write'],
    ['/admin/returns', 'returns:read'],
    ['/admin/support', 'support:read'],
    ['/admin/analytics', 'analytics:read'],
    ['/admin/settings', 'settings:read'],
    ['/admin/staff', 'staff:read'],
    ['/admin/webhooks', PLATFORM_ADMIN],
    ['/admin/audit-logs', PLATFORM_ADMIN],
  ])('%s needs %s', (path, requirement) => {
    expect(requirementForPath(path)).toBe(requirement);
  });

  it('leaves unknown admin paths open to staff', () => {
    expect(requirementForPath('/admin/unknown')).toBeNull();
    expect(requirementForPath('/admin/productsx')).toBeNull();
  });
});

describe('forbiddenInfo', () => {
  it('reads the code and required permission of a 403', () => {
    expect(
      forbiddenInfo(new ApiClientError('nope', 'FORBIDDEN', 403, { required: 'orders:write' })),
    ).toEqual({ code: 'FORBIDDEN', required: 'orders:write' });
    expect(forbiddenInfo(new ApiClientError('x', 'TENANT_FORBIDDEN', 403))).toEqual({
      code: 'TENANT_FORBIDDEN',
      required: null,
    });
    expect(forbiddenInfo(new ApiClientError('x', 'OWNER_REQUIRED', 403))?.code).toBe(
      'OWNER_REQUIRED',
    );
  });

  it('ignores other errors', () => {
    expect(forbiddenInfo(new ApiClientError('x', 'NOT_FOUND', 404))).toBeNull();
    expect(forbiddenInfo(new Error('x'))).toBeNull();
    expect(forbiddenInfo(null)).toBeNull();
  });
});
