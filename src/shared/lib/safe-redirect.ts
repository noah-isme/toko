/**
 * Validates a post-login `redirect` target. Only same-origin absolute paths
 * are accepted ("/products/x?y=1#z"); protocol-relative ("//evil.com"),
 * backslash tricks ("/\\evil.com"), schemes, control characters and the auth
 * pages themselves fall back to `fallback`.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  try {
    const base = 'http://redirect.invalid';
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    if (/^\/(login|register)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
