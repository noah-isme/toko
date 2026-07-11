import { faker } from '@faker-js/faker';
import { HttpResponse, http } from 'msw';

import { apiPath } from '../utils';

import type {
  AuthResponse,
  ForgotPasswordRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SessionInfo,
  UpdateProfileRequest,
  User,
  VerifyEmailRequest,
} from '@/lib/api/types';

const sessionStore = globalThis as { __tokoSessionsRevoked?: boolean };

export const authHandlers = [
  http.get(apiPath('/users/me'), () => {
    const user: User = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      emailVerified: faker.datatype.boolean(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: user });
  }),
  http.post(apiPath('/auth/register'), async ({ request }) => {
    const payload = (await request.json()) as RegisterRequest;

    if (!payload.email || !payload.password || !payload.name) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
          },
        },
        { status: 400 },
      );
    }

    const user: User = {
      id: faker.string.uuid(),
      name: payload.name,
      email: payload.email,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response: AuthResponse = {
      user,
      accessToken: faker.string.alphanumeric(40),
    };

    return HttpResponse.json({ data: response }, { status: 201 });
  }),
  http.post(apiPath('/auth/login'), () => {
    // Basic login mock
    const user: User = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    const response: AuthResponse = {
      user,
      accessToken: faker.string.alphanumeric(40),
    };

    return HttpResponse.json({ data: response });
  }),
  http.get(apiPath('/auth/sessions'), () => {
    const now = new Date();
    const sessions: SessionInfo[] = [
      {
        id: faker.string.uuid(),
        device: 'Chrome on macOS',
        ipAddress: faker.internet.ip(),
        location: 'Jakarta, ID',
        lastActive: now.toISOString(),
        current: true,
      },
      {
        id: faker.string.uuid(),
        device: 'Safari on iOS',
        ipAddress: faker.internet.ip(),
        location: 'Bandung, ID',
        lastActive: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        current: false,
      },
    ];

    if (sessionStore.__tokoSessionsRevoked) {
      return HttpResponse.json({ data: sessions.filter((session) => session.current) });
    }

    return HttpResponse.json({ data: sessions });
  }),
  http.post(apiPath('/auth/logout/all'), () => {
    sessionStore.__tokoSessionsRevoked = true;
    return HttpResponse.json({ data: { message: 'Semua sesi telah keluar.' } });
  }),
  http.post(apiPath('/auth/password/forgot'), async ({ request }) => {
    const payload = (await request.json()) as ForgotPasswordRequest;

    if (!payload.email) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email wajib diisi',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ data: { message: 'Password reset email sent' } });
  }),
  http.post(apiPath('/auth/password/reset'), async ({ request }) => {
    const payload = (await request.json()) as ResetPasswordRequest;

    if (!payload.token || !payload.newPassword || payload.newPassword.length < 8) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Reset token atau password tidak valid',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ data: { message: 'Password reset successfully' } });
  }),
  http.post(apiPath('/auth/email/verify'), async ({ request }) => {
    const payload = (await request.json()) as VerifyEmailRequest;

    if (!payload.token) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token verifikasi tidak valid',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ data: { message: 'Email verified successfully' } });
  }),
  http.post(apiPath('/auth/email/resend'), async ({ request }) => {
    const payload = (await request.json()) as ResendVerificationRequest;

    if (!payload.email) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email wajib diisi',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ data: { message: 'Verification email sent' } });
  }),
  http.patch(apiPath('/users/me'), async ({ request }) => {
    const payload = (await request.json()) as UpdateProfileRequest;

    if (!payload.name) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Nama wajib diisi',
          },
        },
        { status: 400 },
      );
    }

    const user: User = {
      id: faker.string.uuid(),
      name: payload.name,
      email: faker.internet.email(),
      emailVerified: faker.datatype.boolean(),
      phone: payload.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: user });
  }),
];
