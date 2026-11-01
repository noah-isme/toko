import { NextRequest, NextResponse } from 'next/server';

import type { MockBinaryResult, MockResult } from '@/mocks/route';

// The built-in API is a development/test fixture (implementation in src/mocks/).
// Development keeps mocks on unless NEXT_PUBLIC_API_MOCKING=false; production
// needs NEXT_PUBLIC_API_URL=mock or NEXT_PUBLIC_API_MOCKING=true. The `if` below
// must stay a literal env expression so non-mock builds drop the mock chunk
// entirely (enforced by tests/config/mock-gate.test.ts).
const NO_STORE = 'private, no-store, max-age=0, must-revalidate';
const SESSION_COOKIE = 'mockSessionId';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Context = { params: Promise<{ path?: string[] }> };

function isBinary(result: MockResult): result is MockBinaryResult {
  return !Array.isArray(result) && ArrayBuffer.isView(result.__binary?.body);
}

function buildResponse(result: MockResult | null): NextResponse {
  if (!result) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  // A `{ file }` result (see MockFile in src/mocks/resolvers/types.ts) is an attachment.
  if (!Array.isArray(result) && typeof result.file?.body === 'string') {
    const { body, contentType, filename } = result.file;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }
  // Non-JSON payloads (invoice PDFs) are sent as-is with their own headers.
  if (isBinary(result)) {
    const { body, headers } = result.__binary;
    return new NextResponse(body.slice().buffer, { status: result.status, headers });
  }
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
  if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', NO_STORE);
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

/**
 * Multipart uploads (the CSV import) reach resolvers as
 * `{ fields: {name: value}, files: {name: {name, type, size, text}} }`; anything
 * else is read as JSON.
 */
async function readBody(req: NextRequest) {
  if (!req.headers.get('content-type')?.toLowerCase().includes('multipart/form-data')) {
    return readJsonBody(req);
  }
  try {
    const form = await req.formData();
    const fields: Record<string, string> = {};
    const files: Record<string, { name: string; type: string; size: number; text: string }> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') fields[key] = value;
      else
        files[key] = {
          name: value.name,
          type: value.type,
          size: value.size,
          text: await value.text(),
        };
    }
    return { fields, files };
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
    const body = method === 'GET' || method === 'DELETE' ? null : await readBody(req);
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
