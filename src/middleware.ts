import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['id', 'en', 'zh', 'ja', 'ko'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/^\/(id|en|zh|ja|ko)(?=\/|$)/);
  const locale = match?.[1] ?? request.cookies.get('toko-locale')?.value ?? 'id';
  if (!LOCALES.includes(locale)) return NextResponse.next();

  const response = match
    ? NextResponse.rewrite(new URL(pathname.slice(match[0].length) || '/', request.url))
    : NextResponse.next();
  response.cookies.set('toko-locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
