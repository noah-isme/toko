import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getApiBaseUrl,
  getPublicEnv,
  isIndexableDeployment,
  ProductionEnvError,
} from '@/shared/config/env';

const ENV_KEYS = [
  'NODE_ENV',
  'VERCEL_ENV',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_MOCKING',
  'NEXT_PUBLIC_TENANT_ID',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_CDN_URL',
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of ENV_KEYS) {
    if (key === 'NODE_ENV') continue;
    const original = originalEnv[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe('public deployment environment', () => {
  it('rejects localhost, mock, and incomplete configuration in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_MOCKING;
    delete process.env.NEXT_PUBLIC_TENANT_ID;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_CDN_URL;

    expect(() => getPublicEnv()).toThrow(ProductionEnvError);
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('accepts an explicit HTTPS production configuration', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api/v1';
    process.env.NEXT_PUBLIC_API_MOCKING = 'false';
    process.env.NEXT_PUBLIC_TENANT_ID = 'tenant-production';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.com';
    process.env.NEXT_PUBLIC_CDN_URL = 'https://cdn.example.com';

    expect(getPublicEnv()).toMatchObject({
      apiUrl: 'https://api.example.com/api/v1',
      apiMocking: false,
      deployment: 'production',
    });
  });

  it('keeps mock requests same-origin and excludes preview deployments from indexing', () => {
    vi.stubEnv('NODE_ENV', 'test');
    process.env.VERCEL_ENV = 'preview';
    process.env.NEXT_PUBLIC_API_URL = 'mock';
    delete process.env.NEXT_PUBLIC_API_MOCKING;

    expect(getApiBaseUrl()).toBe('/api/v1');
    expect(isIndexableDeployment()).toBe(false);
  });
});
