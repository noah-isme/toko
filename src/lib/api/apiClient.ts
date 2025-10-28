import { z } from 'zod';

const DEFAULT_API_URL = 'http://localhost:8080/api/v1';
const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'mock'
    ? process.env.NEXT_PUBLIC_API_URL
    : DEFAULT_API_URL;

interface ApiClientBaseOptions extends RequestInit {}

interface ApiClientSchemaOptions<T> extends ApiClientBaseOptions {
  schema: z.ZodType<T>;
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
  const { headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && init.body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const baseUrl = API_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    throw new Error((errorBody as { message?: string })?.message ?? response.statusText);
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

async function safeParseJson(response: Response) {
  try {
    return await response.clone().json();
  } catch (error) {
    return null;
  }
}
