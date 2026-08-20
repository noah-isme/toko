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

export function titleize(name?: string | null): string {
  const base = 'toko';
  if (!name) {
    return base;
  }

  return `${name} · ${base}`;
}
