import { NextRequest, NextResponse } from 'next/server';

import {
  DEFAULT_LOCALE,
  isLocale,
  LEGACY_LOCALE_PATH_RE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  LOCALE_PATH_RE,
  stripLocalePrefix,
  type Locale,
} from '@/i18n/config';

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}

function forwardLocaleHeader(request: NextRequest, locale: Locale): Headers {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return headers;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  // Legacy locale prefixes were dropped: send them to the unprefixed (default locale) page.
  if (LEGACY_LOCALE_PATH_RE.test(pathname)) {
    // Set the pathname on a clone: new URL('//host/...', base) would leave the origin.
    const target = request.nextUrl.clone();
    target.pathname = stripLocalePrefix(pathname);
    const response = NextResponse.redirect(target, 308);
    if (!isLocale(cookieLocale)) setLocaleCookie(response, DEFAULT_LOCALE);
    return response;
  }

  const prefixed = pathname.match(LOCALE_PATH_RE)?.[1];
  if (isLocale(prefixed)) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocalePrefix(pathname);
    const response = NextResponse.rewrite(url, {
      request: { headers: forwardLocaleHeader(request, prefixed) },
    });
    setLocaleCookie(response, prefixed);
    return response;
  }

  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const response = NextResponse.next({
    request: { headers: forwardLocaleHeader(request, locale) },
  });
  setLocaleCookie(response, locale);
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
