import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_HEADER, type Locale } from './config';
import { FORMATS, TIME_ZONE } from './formats';

/**
 * Resolves the locale without i18n routing (ADR-010): an explicit override, then the
 * `x-toko-locale` request header set by `src/proxy.ts` (so `/en/...` is English on the very
 * first request, before the cookie exists), then the `toko-locale` cookie, then the default.
 */
export async function resolveRequestLocale(override?: string): Promise<Locale> {
  if (isLocale(override)) return override;

  const fromHeader = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;

  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async ({ locale: override }) => {
  const locale = await resolveRequestLocale(override);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: TIME_ZONE,
    formats: FORMATS,
  };
});
