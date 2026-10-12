import { NextRequest, NextResponse } from 'next/server';

import type { MockResult } from '@/mocks/route';

// The built-in API is a development/test fixture (implementation in src/mocks/).
// Development keeps mocks on unless NEXT_PUBLIC_API_MOCKING=false; production
// needs NEXT_PUBLIC_API_URL=mock or NEXT_PUBLIC_API_MOCKING=true. The `if` below
// must stay a literal env expression so non-mock builds drop the mock chunk
// entirely (enforced by tests/config/mock-gate.test.ts).
const NO_STORE = 'private, no-store, max-age=0, must-revalidate';
const SESSION_COOKIE = 'mockSessionId';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Context = { params: Promise<{ path?: string[] }> };

function buildResponse(result: MockResult | null): NextResponse {
  if (!result) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  if (!Array.isArray(result) && typeof result.status === 'number') {
    const { status, ...rest } = result;
    // 204 No Content must not carry a body (NextResponse.json throws for it).
    if (status === 204) return new NextResponse(null, { status });
    return NextResponse.json(rest, { status });
  }
  return NextResponse.json(result);
}

function jsonResponse(result: MockResult | null, sessionId: string, isNewSession: boolean) {
  const response = buildResponse(result);
  response.headers.set('Cache-Control', NO_STORE);
  if (isNewSession) response.cookies.set(SESSION_COOKIE, sessionId, { path: '/', httpOnly: false });
  return response;
}

function resolveSession(req: NextRequest) {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) return { sessionId: existing, isNewSession: false };
  return { sessionId: crypto.randomUUID(), isNewSession: true };
}

async function readJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function handle(req: NextRequest, { params }: Context, method: Method) {
  if (
    process.env.NEXT_PUBLIC_API_URL === 'mock' ||
    process.env.NEXT_PUBLIC_API_MOCKING === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING !== 'false')
  ) {
    const { handleMockRequest } = await import('@/mocks/route');
    const path = (await params).path?.join('/') || '';
    const { sessionId, isNewSession } = resolveSession(req);
    const body = method === 'GET' || method === 'DELETE' ? null : await readJsonBody(req);
    const result = handleMockRequest(path, method, body, sessionId, req.nextUrl.searchParams, req);
    const response = jsonResponse(result, sessionId, isNewSession);
    // Double-submit CSRF cookie: readable by JS (non-HttpOnly) so apiClient can echo it in a header.
    if (!req.cookies.get('X-CSRF-Token')?.value) {
      response.cookies.set('X-CSRF-Token', crypto.randomUUID(), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
      });
    }
    return response;
  }
  return NextResponse.json(
    { message: 'Not Found' },
    { status: 404, headers: { 'Cache-Control': NO_STORE } },
  );
}

export const GET = (req: NextRequest, ctx: Context) => handle(req, ctx, 'GET');
export const POST = (req: NextRequest, ctx: Context) => handle(req, ctx, 'POST');
export const PUT = (req: NextRequest, ctx: Context) => handle(req, ctx, 'PUT');
export const PATCH = (req: NextRequest, ctx: Context) => handle(req, ctx, 'PATCH');
export const DELETE = (req: NextRequest, ctx: Context) => handle(req, ctx, 'DELETE');
