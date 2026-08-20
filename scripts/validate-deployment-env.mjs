#!/usr/bin/env node

/**
 * Validate the public environment contract used by a Vercel build.
 *
 * This deliberately has no dependencies and checks only configuration shape;
 * it never calls the API and therefore is safe to run in public CI.
 *
 * Local development may use the mock API. Pass --production (or set
 * VERCEL_ENV=production) to enforce the production contract.
 */

const isProduction =
  process.argv.includes('--production') || process.env.VERCEL_ENV === 'production';
const errors = [];

const valueOf = (name) => process.env[name]?.trim() ?? '';

const isLocalHost = (hostname) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

const readUrl = (name, { httpsOnly = false, required = true } = {}) => {
  const value = valueOf(name);

  if (!value) {
    if (required) errors.push(`${name} must be set`);
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`${name} must be an absolute URL (received ${JSON.stringify(value)})`);
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    errors.push(`${name} must use http or https (received ${parsed.protocol})`);
  }

  if (httpsOnly && parsed.protocol !== 'https:') {
    errors.push(`${name} must use https in production`);
  }

  if (isProduction && isLocalHost(parsed.hostname)) {
    errors.push(`${name} must not point to localhost in production`);
  }

  return parsed;
};

const apiUrl = valueOf('NEXT_PUBLIC_API_URL');
if (!apiUrl) {
  if (isProduction) errors.push('NEXT_PUBLIC_API_URL must be set');
} else if (apiUrl === 'mock') {
  if (isProduction) {
    errors.push('NEXT_PUBLIC_API_URL=mock is not allowed in production');
  }
} else {
  readUrl('NEXT_PUBLIC_API_URL', { httpsOnly: isProduction });
}

const siteUrl = readUrl('NEXT_PUBLIC_SITE_URL', {
  httpsOnly: isProduction,
  required: isProduction,
});
if (siteUrl && siteUrl.pathname !== '/' && siteUrl.pathname !== '') {
  errors.push('NEXT_PUBLIC_SITE_URL must be an origin without a path');
}

readUrl('NEXT_PUBLIC_CDN_URL', {
  httpsOnly: isProduction,
  required: isProduction,
});

const mocking = valueOf('NEXT_PUBLIC_API_MOCKING').toLowerCase();
if (isProduction && mocking !== 'false') {
  errors.push('NEXT_PUBLIC_API_MOCKING must be exactly false in production');
}

if (isProduction && !valueOf('NEXT_PUBLIC_TENANT_ID')) {
  errors.push('NEXT_PUBLIC_TENANT_ID must be set in production');
}

const rumDestination = valueOf('NEXT_PUBLIC_RUM_DEST').toLowerCase();
if (rumDestination && !['none', 'posthog', 'sentry', 'both'].includes(rumDestination)) {
  errors.push('NEXT_PUBLIC_RUM_DEST must be one of: none, posthog, sentry, both');
}

if (errors.length > 0) {
  console.error('Deployment environment validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const mode = isProduction ? 'production' : 'local/preview';
  console.log(`Deployment environment is valid for ${mode} mode.`);
}
