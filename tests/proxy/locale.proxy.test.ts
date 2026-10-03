// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { LEGACY_LOCALES } from '@/i18n/config';
import { proxy } from '@/proxy';

function request(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

const forwardedLocale = (response: Response) =>
  response.headers.get('x-middleware-request-x-toko-locale');

describe('locale proxy', () => {
  it('rewrites /en paths, keeps the query, sets the cookie and forwards the locale header', () => {
    const response = proxy(request('/en/products?q=kopi'));

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/products?q=kopi',
    );
    expect(response.cookies.get('toko-locale')?.value).toBe('en');
    expect(forwardedLocale(response)).toBe('en');
  });

  it('rewrites /en to the home page', () => {
    const response = proxy(request('/en'));
    expect(response.headers.get('x-middleware-rewrite')).toBe('http://localhost:3000/');
  });

  it('redirects legacy locale prefixes with 308 and resets an unsupported cookie', () => {
    const legacy = LEGACY_LOCALES[1];
    const response = proxy(request(`/${legacy}/products?page=2`, `toko-locale=${legacy}`));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('http://localhost:3000/products?page=2');
    expect(response.cookies.get('toko-locale')?.value).toBe('id');
  });

  it('keeps a supported cookie on legacy redirects', () => {
    const response = proxy(request(`/${LEGACY_LOCALES[0]}`, 'toko-locale=en'));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
    expect(response.cookies.get('toko-locale')).toBeUndefined();
  });

  it('uses a valid cookie for unprefixed paths', () => {
    const response = proxy(request('/products', 'toko-locale=en'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.cookies.get('toko-locale')?.value).toBe('en');
    expect(forwardedLocale(response)).toBe('en');
  });

  it('overwrites a stale legacy cookie with the default locale', () => {
    const response = proxy(request('/products', `toko-locale=${LEGACY_LOCALES[2]}`));

    expect(response.cookies.get('toko-locale')?.value).toBe('id');
    expect(forwardedLocale(response)).toBe('id');
  });

  it('defaults to id without a cookie', () => {
    const response = proxy(request('/'));
    expect(response.cookies.get('toko-locale')?.value).toBe('id');
    expect(forwardedLocale(response)).toBe('id');
  });
});
