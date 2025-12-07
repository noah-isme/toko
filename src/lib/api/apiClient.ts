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
  try {
    const baseUrl = API_URL.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const newToken = data.data.accessToken;
    setAccessToken(newToken);
    return newToken;
  } catch {
    return null;
  }
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
    }
  }

  const baseUrl = API_URL.replace(/\/$/, '');
  let response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    credentials: 'include',
  });

  // Handle token refresh on 401
  if (response.status === 401 && requiresAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: requestHeaders,
        credentials: 'include',
      });
    }
  }

  if (!response.ok) {
    const errorBody = await safeParseJson<ApiError>(response);
    if (errorBody?.error) {
      throw new ApiClientError(
        errorBody.error.message,
        errorBody.error.code,
        response.status,
        errorBody.error.details,
      );
    }
    throw new ApiClientError(response.statusText, 'UNKNOWN', response.status);
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

async function safeParseJson<T = unknown>(response: Response): Promise<T | null> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export { ApiClientError };
