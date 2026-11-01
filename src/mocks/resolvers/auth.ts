import { MOCK_USER } from '../factories/user';
import { MOCK_ADMIN_TOKEN, MOCK_STAFF_TOKEN_PREFIX } from '../fixtures';

import { sessionValue } from './session';
import { effectiveTenantRole, isStaffRoleSlug, permissionsFor, type MockTenantRole } from './staff';
import type { MockResolver } from './types';

const ACCESS_TOKEN = 'mock-access-token-12345';

export function isAdminRequest(headers: Headers): boolean {
  return headers.get('authorization') === `Bearer ${MOCK_ADMIN_TOKEN}`;
}

function rolesFor(headers: Headers): string[] {
  return isAdminRequest(headers) ? ['admin'] : [];
}

/**
 * The role the caller's token names: `owner` for `MOCK_ADMIN_TOKEN`, the
 * named role for `mock-staff-token-<role>`, `customer` for any other token.
 */
export function tokenTenantRole(headers: Headers): MockTenantRole {
  if (isAdminRequest(headers)) return 'owner';
  const token = headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (token.startsWith(MOCK_STAFF_TOKEN_PREFIX)) {
    const role = token.slice(MOCK_STAFF_TOKEN_PREFIX.length);
    if (isStaffRoleSlug(role)) return role;
  }
  return 'customer';
}

/**
 * The caller's current role in the mock tenant: the token's role, as changed
 * by staff changes to the signed-in user in this mock session.
 */
export function mockTenantRole(headers: Headers, sessionId: string): MockTenantRole {
  return effectiveTenantRole(sessionId, tokenTenantRole(headers));
}

/** `/auth/me` fields for the caller: legacy global roles plus tenant role and permissions. */
export function accessFor(headers: Headers, sessionId: string) {
  const role = mockTenantRole(headers, sessionId);
  return { roles: rolesFor(headers), role, permissions: permissionsFor(role) };
}

function message(text: string) {
  return { data: { message: text } };
}

const MESSAGES: Record<string, string> = {
  'auth/logout': 'Logged out successfully',
  'auth/password/forgot': 'Password reset email sent',
  'auth/password/reset': 'Password reset successfully',
  'auth/email/verify': 'Email verified successfully',
  'auth/email/resend': 'Verification email sent',
};

/**
 * Sessions as `GET /auth/sessions` documents them today: newest first,
 * `lastActive` is the sign-in time, `current` is always false and `location` is
 * never set. `POST /auth/logout/all` revokes them all.
 */
function seedSessions() {
  return {
    revoked: false,
    sessions: [
      {
        id: '5e55a0e1-0000-4000-8000-000000000001',
        device: 'Chrome on macOS',
        ipAddress: '203.0.113.9',
        lastActive: '2026-10-25T08:00:00.000Z',
        current: false,
      },
      {
        id: '5e55a0e1-0000-4000-8000-000000000002',
        device: 'Safari on iOS',
        ipAddress: '198.51.100.24',
        lastActive: '2026-10-24T19:30:00.000Z',
        current: false,
      },
    ],
  };
}

function listSessions(sessionId: string) {
  const state = sessionValue('authSessions', sessionId, seedSessions);
  return { data: state.revoked ? [] : state.sessions };
}

/**
 * Auth and profile. Every token signs in as the same user; `MOCK_ADMIN_TOKEN`
 * additionally carries the global `admin` role and the tenant role `owner`,
 * and `mock-staff-token-<role>` tokens carry that tenant role.
 */
export const resolveAuth: MockResolver = ({ path, method, body, headers, sessionId }) => {
  const now = new Date().toISOString();

  if (path === 'auth/register' && method === 'POST') {
    return {
      data: {
        user: {
          id: MOCK_USER.id,
          name: body?.name || MOCK_USER.name,
          email: body?.email || MOCK_USER.email,
          emailVerified: false,
          createdAt: now,
        },
        accessToken: ACCESS_TOKEN,
      },
    };
  }

  if (path === 'auth/login' && method === 'POST') {
    if (body?.email === 'wrong@example.com' || body?.password === 'wrongpassword') {
      return {
        status: 400,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' },
      };
    }
    return {
      data: {
        user: {
          ...MOCK_USER,
          email: body?.email || MOCK_USER.email,
          emailVerified: true,
          createdAt: now,
        },
        accessToken: ACCESS_TOKEN,
      },
    };
  }

  if (path === 'auth/me' && method === 'GET') {
    return {
      data: { ...MOCK_USER, emailVerified: true, createdAt: now, ...accessFor(headers, sessionId) },
    };
  }

  if (path === 'users/me' && method === 'PATCH') {
    return {
      data: {
        ...MOCK_USER,
        name: body?.name || MOCK_USER.name,
        phone: body?.phone,
        emailVerified: true,
        createdAt: now,
      },
    };
  }

  if (path in MESSAGES && method === 'POST') return message(MESSAGES[path]);

  if (path === 'auth/sessions' && method === 'GET') return listSessions(sessionId);

  if (path === 'auth/logout/all' && method === 'POST') {
    sessionValue('authSessions', sessionId, seedSessions).revoked = true;
    return { status: 204 };
  }

  if (path === 'auth/refresh' && method === 'POST') {
    return { data: { accessToken: 'mock-access-token' } };
  }

  if (path === 'auth/session' && method === 'GET') {
    return { data: { user: { ...MOCK_USER, roles: rolesFor(headers) } } };
  }

  return undefined;
};
