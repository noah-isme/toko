const DEFAULT_SITE_URL = 'http://localhost:3000';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (process.env.NODE_ENV !== 'production' && (!rawSiteUrl || rawSiteUrl === DEFAULT_SITE_URL)) {
  // eslint-disable-next-line no-console
  console.warn(
    'NEXT_PUBLIC_SITE_URL is not defined. Falling back to http://localhost:3000. Set it in your environment to generate accurate metadata.',
  );
}

export const siteUrl = (() => {
  try {
    return new URL(rawSiteUrl ?? DEFAULT_SITE_URL).toString().replace(/\/$/, '');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Invalid NEXT_PUBLIC_SITE_URL provided. Falling back to default.', error);
    }
    return DEFAULT_SITE_URL;
  }
})();

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
