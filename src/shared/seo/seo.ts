import { DEFAULT_LOCALE, localizedPath, type Locale } from '@/i18n/config';
import { getPublicEnv } from '@/shared/config/env';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const publicEnv = getPublicEnv();

if (process.env.NODE_ENV !== 'production' && (!rawSiteUrl || rawSiteUrl === publicEnv.siteUrl)) {
  console.warn(
    `NEXT_PUBLIC_SITE_URL is not defined. Falling back to ${publicEnv.siteUrl}. Set it in your environment to generate accurate metadata.`,
  );
}

/** The validated deployment origin used for canonical URLs and metadata. */
export const siteUrl = publicEnv.siteUrl;

export const metadataBase = new URL(siteUrl);

export function abs(pathOrUrl: string): string {
  if (!pathOrUrl) {
    return siteUrl;
  }

  try {
    const url = new URL(pathOrUrl, metadataBase);
    return url.toString();
  } catch {
    return siteUrl;
  }
}

export function getCanonical(pathname?: string | null): string {
  if (!pathname) {
    return abs('/');
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return abs(normalized);
}

/**
 * hreflang alternates for a path: `id` (default, unprefixed), `en` (`/en...`) and `x-default`.
 * Suitable for both `Metadata.alternates.languages` and sitemap `alternates.languages`.
 */
export function localeAlternates(pathname: string): Record<'id' | 'en' | 'x-default', string> {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const canonical = abs(localizedPath(DEFAULT_LOCALE, normalized));
  return {
    id: canonical,
    en: abs(localizedPath('en', normalized)),
    'x-default': canonical,
  };
}

/** Self-referencing canonical URL of a path in a locale: `id` unprefixed, `en` under `/en`. */
export function localizedCanonical(locale: Locale, pathname: string): string {
  return getCanonical(localizedPath(locale, pathname));
}

/**
 * URL of the generated Open Graph image (`/api/og`). The default locale needs no parameter;
 * other locales pass `locale` because `/api` bypasses the proxy that forwards the locale.
 */
export function ogImageUrl(locale: Locale, title?: string): string {
  const params: string[] = [];
  if (title) params.push(`title=${encodeURIComponent(title)}`);
  if (locale !== DEFAULT_LOCALE) params.push(`locale=${locale}`);
  return abs(params.length ? `/api/og?${params.join('&')}` : '/api/og');
}

export function titleize(name?: string | null): string {
  const base = 'toko';
  if (!name) {
    return base;
  }

  return `${name} · ${base}`;
}
