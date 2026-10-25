import { HttpResponse, http } from 'msw';

import { mockFaker as faker } from '../factories/faker';
import { resolveAuth } from '../resolvers/auth';
import { apiPath, mockResultResponse, mockSessionId } from '../utils';

import type {
  AuthResponse,
  ForgotPasswordRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  User,
  VerifyEmailRequest,
} from '@/lib/api/types';

const NOT_FOUND = { status: 404, error: { code: 'NOT_FOUND', message: 'Not Found' } };

function viaAuthResolver(request: Request, path: string) {
  const result = resolveAuth({
    path,
    method: request.method,
    body: null,
    sessionId: mockSessionId(request),
    searchParams: new URL(request.url).searchParams,
    headers: request.headers,
  });
  return mockResultResponse(result ?? NOT_FOUND);
}

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
  http.post(apiPath('/auth/login'), async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    // Mirror the route handler (src/mocks/resolvers/auth.ts): these
    // sentinel credentials must fail so the error path stays testable.
    if (body?.email === 'wrong@example.com' || body?.password === 'wrongpassword') {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' } },
        { status: 400 },
      );
    }

    const user: User = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: body?.email ?? faker.internet.email(),
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    const response: AuthResponse = {
      user,
      accessToken: faker.string.alphanumeric(40),
    };

    return HttpResponse.json({ data: response });
  }),
  // Sessions and logout-all share the route mock's resolver and per-session state.
  http.get(apiPath('/auth/sessions'), ({ request }) => viaAuthResolver(request, 'auth/sessions')),
  http.post(apiPath('/auth/logout/all'), ({ request }) =>
    viaAuthResolver(request, 'auth/logout/all'),
  ),
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
