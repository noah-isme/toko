import { z } from 'zod';

import type { ApiError } from './types';

import { getApiBaseUrl, getPublicEnv } from '@/shared/config/env';

// Environment variables are embedded into the Next.js bundle at build time.
// Resolve them once so test suites that temporarily mutate process.env do not
// change the base URL halfway through an in-flight request.
const API_URL = getApiBaseUrl();
const TENANT_ID = getPublicEnv().tenantId;

interface ApiClientBaseOptions extends RequestInit {
  requiresAuth?: boolean;
}

interface ApiClientSchemaOptions<T> extends ApiClientBaseOptions {
  schema: z.ZodType<T>;
}

class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

class NetworkError extends Error {
  constructor(message = 'The network request failed', options?: ErrorOptions) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

class AbortError extends Error {
  constructor(message = 'The request was aborted', options?: ErrorOptions) {
    super(message, options);
    this.name = 'AbortError';
  }
}

class AuthError extends ApiClientError {
  constructor(message: string, code: string, status: 401 | 403, details?: Record<string, any>) {
    super(message, code, status, details);
    this.name = 'AuthError';
  }
}

let accessToken: string | null = null;

export const CSRF_COOKIE_NAME = 'X-CSRF-Token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${encodeURIComponent(CSRF_COOKIE_NAME)}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
  return getCsrfTokenFromCookie();
}

export function setCsrfToken(token: string | null) {
  if (typeof document !== 'undefined') {
    if (token) {
      document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    } else {
      document.cookie = `${CSRF_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

let csrfBootstrapPromise: Promise<string | null> | null = null;

/**
 * Ensures a valid CSRF token is available in document.cookie.
 * If missing (or forceRefresh is true), performs ONE explicit safe GET
 * using credentials: "include" to an existing confirmed endpoint (/categories)
 * to allow the backend CSRF middleware to set the X-CSRF-Token cookie.
 * Concurrent callers share the same in-flight bootstrap promise.
 */
export async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const existing = getCsrfTokenFromCookie();
    if (existing) {
      return existing;
    }
  }

  if (csrfBootstrapPromise) {
    return csrfBootstrapPromise;
  }

  csrfBootstrapPromise = (async () => {
    try {
      const baseUrl = API_URL.replace(/\/$/, '');
      const headers = new Headers();
      if (TENANT_ID) {
        headers.set('X-Tenant-ID', TENANT_ID);
      }
      await executeFetch(`${baseUrl}/categories`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      return getCsrfTokenFromCookie();
    } catch (err) {
      console.warn('[ApiClient] Failed to bootstrap CSRF cookie:', err);
      return getCsrfTokenFromCookie();
    } finally {
      csrfBootstrapPromise = null;
    }
  })();

  return csrfBootstrapPromise;
}

async function isCsrfError(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  try {
    const text = await response.clone().text();
    return /missing csrf token|invalid csrf token|csrf/i.test(text);
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const baseUrl = API_URL.replace(/\/$/, '');
  const headers = new Headers();
  const csrf = getCsrfTokenFromCookie();
  if (csrf) {
    headers.set(CSRF_HEADER_NAME, csrf);
  }
  if (TENANT_ID) {
    headers.set('X-Tenant-ID', TENANT_ID);
  }

  const response = await executeFetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw await createResponseError(response);
  }

  const data = await response.json();
  const newToken = data.data.accessToken;
  setAccessToken(newToken);
  return newToken;
}

export async function apiClient<T>(path: string, options: ApiClientSchemaOptions<T>): Promise<T>;
export async function apiClient<T = unknown>(
  path: string,
  options?: ApiClientBaseOptions,
): Promise<T>;
export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientSchemaOptions<T> | ApiClientBaseOptions = {},
): Promise<T> {
  const { headers, requiresAuth = false, ...init } = options;
  const isCsrfRetry = Boolean((options as Record<string, unknown>)._isCsrfRetry);
  const requestHeaders = new Headers(headers);
  if (TENANT_ID && !requestHeaders.has('X-Tenant-ID')) {
    requestHeaders.set('X-Tenant-ID', TENANT_ID);
  }

  if (!requestHeaders.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (requiresAuth) {
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[ApiClient] Warning: requiresAuth is true but no token found for path:', path);
    }
  }

  const method = (init.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isBearerAuth = Boolean(token || requestHeaders.has('Authorization'));

  // Double-submit CSRF cookie contract handling
  if (isMutating && !requestHeaders.has(CSRF_HEADER_NAME)) {
    let csrf = getCsrfTokenFromCookie();
    // For unauthenticated mutating requests, if cookie is missing, perform ONE bootstrap GET
    if (!csrf && !isBearerAuth) {
      csrf = await ensureCsrfToken();
      if (!csrf) {
        throw new ApiClientError(
          'CSRF token cookie (X-CSRF-Token) is missing after bootstrap',
          'CSRF_TOKEN_MISSING',
          403,
        );
      }
    }
    if (csrf) {
      requestHeaders.set(CSRF_HEADER_NAME, csrf);
    }
  }

  const baseUrl = API_URL.replace(/\/$/, '');
  let response = await executeFetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    credentials: 'include',
  });

  // Handle token refresh on 401
  if (response.status === 401 && requiresAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders.set('Authorization', `Bearer ${newToken}`);
      const latestCsrf = getCsrfTokenFromCookie();
      if (latestCsrf && !requestHeaders.has(CSRF_HEADER_NAME)) {
        requestHeaders.set(CSRF_HEADER_NAME, latestCsrf);
      }
      response = await executeFetch(`${baseUrl}${path}`, {
        ...init,
        headers: requestHeaders,
        credentials: 'include',
      });
    }
  }

  // Handle CSRF token refresh and retry on 403 with CSRF error (at most once)
  if (response.status === 403 && !isCsrfRetry && (await isCsrfError(response))) {
    const refreshedCsrf = await ensureCsrfToken(true);
    if (refreshedCsrf) {
      requestHeaders.set(CSRF_HEADER_NAME, refreshedCsrf);
      return apiClient(path, {
        ...options,
        _isCsrfRetry: true,
        headers: requestHeaders,
      } as any);
    }
  }

  if (!response.ok) {
    throw await createResponseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();
  if ('schema' in options && options.schema) {
    return options.schema.parse(data);
  }

  return data as T;
}

async function executeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (isAbortFailure(error)) {
      throw new AbortError('The request was aborted', { cause: error });
    }

    throw new NetworkError('The network request failed', { cause: error });
  }
}

function isAbortFailure(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || /net::ERR_ABORTED/i.test(error.message);
  }

  return false;
}

async function createResponseError(response: Response): Promise<ApiClientError> {
  const errorBody = await safeParseJson<ApiError>(response);
  const message = errorBody?.error?.message || response.statusText || 'Request failed';
  const code = errorBody?.error?.code || 'UNKNOWN';
  const details = errorBody?.error?.details;

  if (response.status === 401 || response.status === 403) {
    return new AuthError(message, code, response.status, details);
  }

  return new ApiClientError(message, code, response.status, details);
}

async function safeParseJson<T = unknown>(response: Response): Promise<T | null> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export { AbortError, ApiClientError, AuthError, NetworkError };
