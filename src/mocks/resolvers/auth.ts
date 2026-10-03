import { MOCK_USER } from '../factories/user';
import { MOCK_ADMIN_TOKEN } from '../fixtures';

import type { MockResolver } from './types';

const ACCESS_TOKEN = 'mock-access-token-12345';

export function isAdminRequest(headers: Headers): boolean {
  return headers.get('authorization') === `Bearer ${MOCK_ADMIN_TOKEN}`;
}

function rolesFor(headers: Headers): string[] {
  return isAdminRequest(headers) ? ['admin'] : [];
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
  'auth/logout/all': 'Semua sesi telah keluar.',
};

/**
 * Auth and profile. Every token signs in as the same customer; the
 * `MOCK_ADMIN_TOKEN` bearer token additionally carries the `admin` role.
 */
export const resolveAuth: MockResolver = ({ path, method, body, headers }) => {
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
      data: { ...MOCK_USER, emailVerified: true, createdAt: now, roles: rolesFor(headers) },
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

  if (path === 'auth/sessions' && method === 'GET') {
    return {
      data: [
        {
          id: 'session-1',
          device: 'Chrome',
          ipAddress: '127.0.0.1',
          location: 'Jakarta, ID',
          lastActive: now,
          current: true,
        },
      ],
    };
  }

  if (path === 'auth/refresh' && method === 'POST') {
    return { data: { accessToken: 'mock-access-token' } };
  }

  if (path === 'auth/session' && method === 'GET') {
    return { data: { user: { ...MOCK_USER, roles: rolesFor(headers) } } };
  }

  return undefined;
};
