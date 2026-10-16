/**
 * Single source of truth for supported locales.
 *
 * `id` is the default locale and is served from unprefixed URLs; `en` lives under `/en/...`.
 * Legacy locales (dropped) are only kept so the proxy can redirect old URLs.
 */
export const LOCALES = ['id', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'id';

/** Previously supported locales; their URL prefixes are 308-redirected by `src/proxy.ts`. */
export const LEGACY_LOCALES = ['zh', 'ja', 'ko'] as const;

export const LOCALE_COOKIE = 'toko-locale';

/** Request header the proxy forwards so server code can read the locale on the first request. */
export const LOCALE_HEADER = 'x-toko-locale';

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_PATH_RE = /^\/(id|en)(?=\/|$)/;

export const LEGACY_LOCALE_PATH_RE = new RegExp(`^/(${LEGACY_LOCALES.join('|')})(?=/|$)`);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Removes a supported or legacy locale prefix: `/en/products` -> `/products`, `/en` -> `/`. */
export function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(LOCALE_PATH_RE) ?? pathname.match(LEGACY_LOCALE_PATH_RE);
  if (!match) return pathname || '/';
  return pathname.slice(match[0].length) || '/';
}

/** Builds the public path for a locale: `id` is unprefixed, `en` -> `/en...` (`/` -> `/en`). */
export function localizedPath(locale: Locale, pathname: string): string {
  const stripped = stripLocalePrefix(pathname.startsWith('/') ? pathname : `/${pathname}`);
  if (locale === DEFAULT_LOCALE) return stripped;
  return stripped === '/' ? `/${locale}` : `/${locale}${stripped}`;
}
