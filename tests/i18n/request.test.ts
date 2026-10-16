// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestState = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  cookies: new Map<string, string>(),
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => requestState.headers.get(name) ?? null }),
  cookies: async () => ({
    get: (name: string) => {
      const value = requestState.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';

import { LOCALE_COOKIE, LOCALE_HEADER } from '@/i18n/config';
import { FORMATS } from '@/i18n/formats';
import requestConfig, { resolveRequestLocale } from '@/i18n/request';

type ConfigFn = (params: {
  locale?: string;
  requestLocale: Promise<string | undefined>;
}) => Promise<{ locale: string; messages: unknown; timeZone: string; formats: unknown }>;

const getConfig = requestConfig as unknown as ConfigFn;

describe('src/i18n/request.ts', () => {
  beforeEach(() => {
    requestState.headers.clear();
    requestState.cookies.clear();
  });

  it('defaults to id', async () => {
    await expect(resolveRequestLocale()).resolves.toBe('id');
  });

  it('uses the cookie when there is no proxy header', async () => {
    requestState.cookies.set(LOCALE_COOKIE, 'en');
    await expect(resolveRequestLocale()).resolves.toBe('en');
  });

  it('prefers the proxy header over the cookie (first request to /en/...)', async () => {
    requestState.cookies.set(LOCALE_COOKIE, 'id');
    requestState.headers.set(LOCALE_HEADER, 'en');
    await expect(resolveRequestLocale()).resolves.toBe('en');
  });

  it('ignores unsupported header and cookie values', async () => {
    requestState.headers.set(LOCALE_HEADER, 'ja');
    requestState.cookies.set(LOCALE_COOKIE, 'ko');
    await expect(resolveRequestLocale()).resolves.toBe('id');
  });

  it('honours an explicit locale override', async () => {
    requestState.headers.set(LOCALE_HEADER, 'id');
    await expect(resolveRequestLocale('en')).resolves.toBe('en');
  });

  it('returns the matching catalog, Asia/Jakarta and the shared formats', async () => {
    requestState.headers.set(LOCALE_HEADER, 'en');
    const config = await getConfig({ requestLocale: Promise.resolve(undefined) });
    expect(config).toEqual({
      locale: 'en',
      messages: enMessages,
      timeZone: 'Asia/Jakarta',
      formats: FORMATS,
    });

    requestState.headers.clear();
    const fallback = await getConfig({ requestLocale: Promise.resolve(undefined) });
    expect(fallback.locale).toBe('id');
    expect(fallback.messages).toEqual(idMessages);
  });
});
