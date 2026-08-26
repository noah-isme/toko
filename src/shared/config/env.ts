/**
 * Public runtime configuration used by the browser and server components.
 *
 * Development and test environments intentionally retain the existing local
 * defaults so the mock-powered workflow keeps working. Production is
 * different: silently falling back to localhost (or to MSW) can make a
 * deployment look healthy while every request is pointed at the wrong
 * service, so the required values are validated eagerly.
 */

export type DeploymentEnvironment = 'production' | 'preview' | 'development';

export interface PublicEnv {
  apiUrl: string;
  apiMocking: boolean;
  tenantId: string | undefined;
  siteUrl: string;
  cdnUrl: string;
  deployment: DeploymentEnvironment;
}

export class ProductionEnvError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid production environment:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ProductionEnvError';
    this.issues = issues;
  }
}

const DEFAULT_API_URL = 'http://localhost:8080/api/v1';
const DEFAULT_SITE_URL = 'http://localhost:3000';
const DEFAULT_CDN_URL = 'http://localhost:3000/cdn';

type EnvironmentKey =
  | 'NEXT_PUBLIC_API_URL'
  | 'NEXT_PUBLIC_API_MOCKING'
  | 'NEXT_PUBLIC_TENANT_ID'
  | 'NEXT_PUBLIC_SITE_URL'
  | 'NEXT_PUBLIC_CDN_URL'
  | 'VERCEL_ENV';

function value(name: EnvironmentKey): string | undefined {
  // Keep these as static property accesses. Next.js inlines NEXT_PUBLIC_*
  // values into browser bundles, but dynamic process.env[name] lookups are
  // not replaced and would otherwise fall back to localhost in production.
  let raw: string | undefined;
  switch (name) {
    case 'NEXT_PUBLIC_API_URL':
      raw = process.env.NEXT_PUBLIC_API_URL;
      break;
    case 'NEXT_PUBLIC_API_MOCKING':
      raw = process.env.NEXT_PUBLIC_API_MOCKING;
      break;
    case 'NEXT_PUBLIC_TENANT_ID':
      raw = process.env.NEXT_PUBLIC_TENANT_ID;
      break;
    case 'NEXT_PUBLIC_SITE_URL':
      raw = process.env.NEXT_PUBLIC_SITE_URL;
      break;
    case 'NEXT_PUBLIC_CDN_URL':
      raw = process.env.NEXT_PUBLIC_CDN_URL;
      break;
    case 'VERCEL_ENV':
      raw = process.env.VERCEL_ENV;
      break;
  }

  const trimmed = raw?.trim();
  return trimmed || undefined;
}

function deploymentEnvironment(): DeploymentEnvironment {
  const vercelEnvironment = value('VERCEL_ENV');
  if (vercelEnvironment === 'production') return 'production';
  if (vercelEnvironment === 'preview') return 'preview';
  if (vercelEnvironment === 'development') return 'development';
  return 'development';
}

function normaliseUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (raw.toLowerCase() === 'mock') return raw;

  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function isLocalOrPlaceholder(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      raw.toLowerCase() === 'mock'
    );
  } catch {
    return raw.toLowerCase() === 'mock';
  }
}

function validateProduction(env: PublicEnv): void {
  const issues: string[] = [];

  if (!env.apiUrl || env.apiUrl === 'mock') {
    issues.push('NEXT_PUBLIC_API_URL must point to the production API');
  } else {
    try {
      const api = new URL(env.apiUrl);
      if (api.protocol !== 'https:') {
        issues.push('NEXT_PUBLIC_API_URL must use HTTPS');
      }
      if (isLocalOrPlaceholder(env.apiUrl)) {
        issues.push('NEXT_PUBLIC_API_URL must not point to localhost or a local placeholder');
      }
    } catch {
      issues.push('NEXT_PUBLIC_API_URL must be an absolute URL');
    }
  }

  if (value('NEXT_PUBLIC_API_MOCKING') !== 'false') {
    issues.push('NEXT_PUBLIC_API_MOCKING must be set to false in production');
  }

  if (!env.tenantId) {
    issues.push('NEXT_PUBLIC_TENANT_ID is required in production');
  }

  for (const [name, raw] of [
    ['NEXT_PUBLIC_SITE_URL', env.siteUrl],
    ['NEXT_PUBLIC_CDN_URL', env.cdnUrl],
  ] as const) {
    if (!raw || isLocalOrPlaceholder(raw)) {
      issues.push(`${name} must point to a public production host`);
      continue;
    }

    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== 'https:') {
        issues.push(`${name} must use HTTPS`);
      }
    } catch {
      issues.push(`${name} must be an absolute URL`);
    }
  }

  if (issues.length > 0) {
    throw new ProductionEnvError(issues);
  }
}

export function getPublicEnv(): PublicEnv {
  const apiUrlRaw = value('NEXT_PUBLIC_API_URL');
  const apiMockingRaw = value('NEXT_PUBLIC_API_MOCKING');
  const env: PublicEnv = {
    apiUrl: normaliseUrl(apiUrlRaw, DEFAULT_API_URL),
    apiMocking:
      apiMockingRaw === 'true' ||
      (!apiMockingRaw && (apiUrlRaw === undefined || apiUrlRaw.toLowerCase() === 'mock')),
    tenantId: value('NEXT_PUBLIC_TENANT_ID'),
    siteUrl: normaliseUrl(value('NEXT_PUBLIC_SITE_URL'), DEFAULT_SITE_URL),
    cdnUrl: normaliseUrl(value('NEXT_PUBLIC_CDN_URL'), DEFAULT_CDN_URL),
    deployment: deploymentEnvironment(),
  };

  // Do not validate this at module load in tests/development: those workflows
  // intentionally use the mock API and localhost defaults.
  if (env.deployment === 'production') {
    validateProduction(env);
  }

  return env;
}

export function getApiBaseUrl(): string {
  const env = getPublicEnv();
  const rawApiUrl = value('NEXT_PUBLIC_API_URL');

  // Keep the historical localhost fallback when no API URL is supplied. The
  // test harness still enables MSW by default in that case, while requests
  // retain the localhost origin expected by its handlers. An explicit mock
  // URL or mocking flag uses the same-origin mock route instead.
  if (!rawApiUrl && !value('NEXT_PUBLIC_API_MOCKING')) {
    return DEFAULT_API_URL;
  }

  return env.apiUrl === 'mock' || env.apiMocking ? '/api/v1' : env.apiUrl;
}

export function isMockEnvironment(): boolean {
  const env = getPublicEnv();
  return env.apiUrl === 'mock' || env.apiMocking;
}

/**
 * Preview deployments must never advertise themselves to search engines. A
 * local development build remains indexable in metadata tests and when a
 * developer intentionally inspects generated tags.
 */
export function isIndexableDeployment(): boolean {
  return getPublicEnv().deployment !== 'preview';
}
