/**
 * Staff RBAC mock: roles, permission gating of admin routes, staff mutations
 * with the backend's error codes, and MSW/route parity for the new endpoints.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { MOCK_ADMIN_TOKEN, MOCK_STAFF_TOKEN_PREFIX } from '../fixtures';
import { resetMockState } from '../resolvers/session';
import { permissionsFor } from '../resolvers/staff';
import { handleMockRequest } from '../route';

type Json = any;

const OWNER = `Bearer ${MOCK_ADMIN_TOKEN}`;
const staffToken = (role: string) => `Bearer ${MOCK_STAFF_TOKEN_PREFIX}${role}`;

function call(
  method: string,
  path: string,
  { auth = OWNER, body = null, query = '', session = 's1' } = {} as {
    auth?: string;
    body?: unknown;
    query?: string;
    session?: string;
  },
): Json {
  return handleMockRequest(path, method, body, session, new URLSearchParams(query), {
    headers: new Headers({ authorization: auth }),
  });
}

afterEach(() => resetMockState());

describe('auth/me tenant role', () => {
  it('reports the tenant role and permissions of each token', () => {
    expect(call('GET', 'auth/me', { auth: 'Bearer mock-token' }).data).toMatchObject({
      roles: [],
      role: 'customer',
      permissions: [],
    });
    const support = call('GET', 'auth/me', { auth: staffToken('support') }).data;
    expect(support.roles).toEqual([]);
    expect(support.role).toBe('support');
    expect(support.permissions).toEqual([
      'customers:read',
      'orders:read',
      'returns:read',
      'returns:write',
      'support:read',
      'support:write',
    ]);
  });

  it('treats an unknown staff token as a customer', () => {
    expect(call('GET', 'auth/me', { auth: staffToken('wizard') }).data.role).toBe('customer');
  });
});

describe('admin route permissions', () => {
  it('lets a role reach only the routes its permissions cover', () => {
    const catalog = staffToken('catalog');
    expect(call('GET', 'admin/products', { auth: catalog }).data).toBeDefined();
    expect(call('GET', 'admin/orders', { auth: catalog })).toEqual({
      status: 403,
      error: {
        code: 'FORBIDDEN',
        message: 'insufficient permissions',
        details: { required: 'orders:read' },
      },
    });
    expect(call('GET', 'admin/staff', { auth: catalog }).error.details.required).toBe('staff:read');
  });

  it('separates read and write permissions', () => {
    const analyst = staffToken('analyst');
    const product = call('GET', 'admin/products', { auth: analyst }).data[0];
    expect(product).toBeDefined();
    expect(
      call('PATCH', `admin/products/${product.id}`, { auth: analyst, body: { title: 'x' } }).error
        .details.required,
    ).toBe('catalog:write');
    expect(
      call('PATCH', `admin/products/${product.id}/stock`, {
        auth: staffToken('catalog'),
        body: { stock: 3 },
      }).data.stock,
    ).toBe(3);
  });

  it('keeps platform routes behind the global admin role', () => {
    const manager = staffToken('manager');
    expect(call('GET', 'admin/audit-logs', { auth: manager }).error.details.required).toBe(
      'platform-admin',
    );
    // The owner token is also a platform admin; the route itself is not mocked.
    expect(call('GET', 'admin/audit-logs').status).toBe(404);
  });
});

describe('staff endpoints', () => {
  it('lists the role matrix in rank order', () => {
    const roles = call('GET', 'admin/roles').data;
    expect(roles.map((r: Json) => r.role)).toEqual([
      'owner',
      'admin',
      'manager',
      'catalog',
      'fulfillment',
      'support',
      'analyst',
    ]);
    expect(roles[2].permissions).toEqual(permissionsFor('manager'));
    expect(roles[2].permissions).not.toContain('staff:manage');
  });

  it('lists staff by rank then email, with pagination', () => {
    const page = call('GET', 'admin/staff');
    expect(page.data.map((m: Json) => [m.email, m.role])).toEqual([
      ['john.doe@example.com', 'owner'],
      ['admin@toko.com', 'admin'],
      ['noah@toko.com', 'manager'],
      ['siti@example.com', 'catalog'],
      ['budi@example.com', 'support'],
    ]);
    expect(page.pagination).toEqual({ page: 1, perPage: 20, totalItems: 5 });
    expect(call('GET', 'admin/staff', { query: 'page=2&limit=2' }).data).toHaveLength(2);
    expect(call('GET', 'admin/staff', { query: 'limit=500' }).pagination.perPage).toBe(100);
  });

  it('assigns a role by email to an existing member', () => {
    const created = call('POST', 'admin/staff', {
      body: { email: 'ANDI@example.com', role: 'fulfillment' },
    });
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ email: 'andi@example.com', role: 'fulfillment' });
    expect(call('GET', 'admin/staff').pagination.totalItems).toBe(6);
  });

  it('returns the documented assign errors', () => {
    expect(
      call('POST', 'admin/staff', { body: { email: 'nope', role: 'support' } }).error.code,
    ).toBe('VALIDATION_ERROR');
    expect(
      call('POST', 'admin/staff', { body: { email: 'andi@example.com', role: 'customer' } }).error
        .code,
    ).toBe('VALIDATION_ERROR');
    expect(
      call('POST', 'admin/staff', { body: { email: 'ghost@example.com', role: 'support' } }),
    ).toMatchObject({ status: 404, error: { code: 'USER_NOT_FOUND' } });
    expect(
      call('POST', 'admin/staff', { body: { email: 'budi@example.com', role: 'manager' } }),
    ).toMatchObject({ status: 409, error: { code: 'STAFF_EXISTS' } });
    expect(
      call('POST', 'admin/staff', {
        auth: staffToken('admin'),
        body: { email: 'andi@example.com', role: 'owner' },
      }),
    ).toMatchObject({ status: 403, error: { code: 'OWNER_REQUIRED' } });
    expect(
      call('POST', 'admin/staff', {
        auth: staffToken('manager'),
        body: { email: 'andi@example.com', role: 'support' },
      }).error.details.required,
    ).toBe('staff:manage');
  });

  it('changes and revokes roles with owner and last-owner protection', () => {
    const staff = call('GET', 'admin/staff').data as Json[];
    const owner = staff.find((m) => m.role === 'owner');
    const budi = staff.find((m) => m.email === 'budi@example.com');

    expect(
      call('PATCH', `admin/staff/${budi.userId}`, { body: { role: 'manager' } }),
    ).toMatchObject({ data: { role: 'manager' } });
    expect(call('PATCH', `admin/staff/${owner.userId}`, { body: { role: 'admin' } })).toMatchObject(
      { status: 409, error: { code: 'LAST_OWNER' } },
    );
    expect(call('DELETE', `admin/staff/${owner.userId}`)).toMatchObject({
      status: 409,
      error: { code: 'LAST_OWNER' },
    });
    // As an admin, the tenant's owner is admin@toko.com (see the seeding test).
    const adminView = call('GET', 'admin/staff', { auth: staffToken('admin') }).data as Json[];
    const tenantOwner = adminView.find((m) => m.role === 'owner');
    expect(
      call('PATCH', `admin/staff/${tenantOwner.userId}`, {
        auth: staffToken('admin'),
        body: { role: 'admin' },
      }),
    ).toMatchObject({ status: 403, error: { code: 'OWNER_REQUIRED' } });

    expect(
      call('PATCH', `admin/staff/${budi.userId}`, { body: { role: 'customer' } }).error.code,
    ).toBe('VALIDATION_ERROR');

    // A second owner lifts the last-owner block. The revoked caller is no
    // longer staff, so their next admin request is refused.
    call('PATCH', `admin/staff/${budi.userId}`, { body: { role: 'owner' } });
    expect(call('DELETE', `admin/staff/${owner.userId}`)).toEqual({ status: 204 });
    expect(call('DELETE', `admin/staff/${owner.userId}`)).toMatchObject({
      status: 403,
      error: { code: 'FORBIDDEN', details: { required: 'staff' } },
    });
  });

  it('validates the PATCH role before looking up the target, like the backend', () => {
    expect(call('PATCH', 'admin/staff/no-such-user', { body: { role: 'wizard' } })).toMatchObject({
      status: 400,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(call('PATCH', 'admin/staff/no-such-user', { body: { role: 'manager' } })).toMatchObject({
      status: 404,
      error: { code: 'STAFF_NOT_FOUND' },
    });
  });

  it('seeds the signed-in user with the role their token names', () => {
    const asAdmin = call('GET', 'admin/staff', { auth: staffToken('admin') }).data as Json[];
    expect(asAdmin.find((m) => m.email === 'john.doe@example.com').role).toBe('admin');
    // Someone else owns the tenant, so the owner rules can be tried as an admin.
    expect(asAdmin.filter((m) => m.role === 'owner').map((m) => m.email)).toEqual([
      'admin@toko.com',
    ]);
  });

  it('applies a self role change or revoke to /auth/me and admin permissions', () => {
    const auth = staffToken('admin');
    const me = (call('GET', 'admin/staff', { auth }).data as Json[]).find(
      (m) => m.email === 'john.doe@example.com',
    );
    call('PATCH', `admin/staff/${me.userId}`, { auth, body: { role: 'support' } });
    expect(call('GET', 'auth/me', { auth }).data).toMatchObject({
      role: 'support',
      permissions: permissionsFor('support'),
    });
    expect(call('GET', 'admin/staff', { auth }).error.details.required).toBe('staff:read');
    // Another session keeps the token's role.
    expect(call('GET', 'auth/me', { auth, session: 's2' }).data.role).toBe('admin');
  });

  it('turns a revoked global admin into a customer who is refused everywhere', () => {
    const staff = call('GET', 'admin/staff').data as Json[];
    const me = staff.find((m) => m.email === 'john.doe@example.com');
    const budi = staff.find((m) => m.email === 'budi@example.com');
    call('PATCH', `admin/staff/${budi.userId}`, { body: { role: 'owner' } });
    expect(call('DELETE', `admin/staff/${me.userId}`)).toEqual({ status: 204 });

    expect(call('GET', 'auth/me').data).toMatchObject({
      roles: ['admin'],
      role: 'customer',
      permissions: [],
    });
    // Platform routes sit behind the staff check too.
    expect(call('GET', 'admin/audit-logs').error.details.required).toBe('staff');
  });

  it('keeps staff changes per session', () => {
    const budi = (call('GET', 'admin/staff').data as Json[]).find(
      (m) => m.email === 'budi@example.com',
    );
    call('DELETE', `admin/staff/${budi.userId}`);
    expect(call('GET', 'admin/staff').pagination.totalItems).toBe(4);
    expect(call('GET', 'admin/staff', { session: 's2' }).pagination.totalItems).toBe(5);
  });
});

describe('MSW and route mocks agree on staff and sessions', () => {
  async function viaMsw(method: string, path: string, body?: unknown, auth = OWNER) {
    const res = await fetch(`http://localhost/api/v1/${path}`, {
      method,
      headers: {
        authorization: auth,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  function viaRoute(method: string, path: string, body?: unknown, auth = OWNER) {
    const [pathname, query = ''] = path.split('?');
    const result = call(method, pathname, { auth, body: body ?? null, query, session: 'msw' });
    if (typeof result.status === 'number') {
      const { status, ...rest } = result;
      return { status, body: status === 204 ? null : rest };
    }
    return { status: 200, body: result };
  }

  it('serves the same staff responses through both layers', async () => {
    const steps: Array<[string, string, unknown?, string?]> = [
      ['GET', 'admin/roles'],
      ['GET', 'admin/staff?page=1&limit=3'],
      ['POST', 'admin/staff', { email: 'ghost@example.com', role: 'support' }],
      ['GET', 'admin/staff', undefined, staffToken('catalog')],
    ];
    for (const [method, path, body, auth] of steps) {
      // Each layer mutates the same `msw` session; compare read-only and error steps.
      expect(await viaMsw(method, path, body, auth), `${method} ${path}`).toEqual(
        viaRoute(method, path, body, auth),
      );
    }
  });

  it('applies MSW staff mutations to the shared session store', async () => {
    const created = await viaMsw('POST', 'admin/staff', {
      email: 'dewi@example.com',
      role: 'analyst',
    });
    expect(created.status).toBe(201);
    expect(viaRoute('GET', 'admin/staff').body.pagination.totalItems).toBe(6);
    const removed = await viaMsw('DELETE', `admin/staff/${created.body.data.userId}`);
    expect(removed).toEqual({ status: 204, body: null });
  });

  it('answers a profile save like the backend: global roles, no tenant role', async () => {
    const body = { name: 'Johnny' };
    for (const [auth, roles] of [
      [OWNER, ['admin']],
      [staffToken('support'), []],
    ] as const) {
      for (const user of [
        (await viaMsw('PATCH', 'users/me', body, auth)).body.data,
        viaRoute('PATCH', 'users/me', body, auth).body.data,
      ]) {
        expect(user.name).toBe('Johnny');
        expect(user.roles).toEqual(roles);
        expect(user).not.toHaveProperty('role');
        expect(user).not.toHaveProperty('permissions');
      }
    }
  });

  it('serves sessions and logout-all per the documented contract', async () => {
    expect(await viaMsw('GET', 'auth/sessions')).toEqual(viaRoute('GET', 'auth/sessions'));
    const sessions = viaRoute('GET', 'auth/sessions').body.data as Json[];
    expect(sessions.every((s) => s.current === false && !('location' in s))).toBe(true);
    expect(await viaMsw('POST', 'auth/logout/all')).toEqual({ status: 204, body: null });
    expect(viaRoute('GET', 'auth/sessions').body.data).toEqual([]);
  });
});
