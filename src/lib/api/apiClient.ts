import { z } from 'zod';

import type { ApiError } from './types';

const DEFAULT_API_URL = 'http://localhost:8080/api/v1';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'mock'
    ? process.env.NEXT_PUBLIC_API_URL
    : DEFAULT_API_URL;

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

async function refreshAccessToken(): Promise<string | null> {
  const baseUrl = API_URL.replace(/\/$/, '');
  const response = await executeFetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
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
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && init.body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = getAccessToken();

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[ApiClient] Warning: requiresAuth is true but no token found for path:', path);
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
      response = await executeFetch(`${baseUrl}${path}`, {
        ...init,
        headers: requestHeaders,
        credentials: 'include',
      });
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
