import { z } from 'zod';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export const baseURLFromEnv = () =>
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== ''
    ? process.env.NEXT_PUBLIC_API_URL
    : DEFAULT_API_BASE_URL;

type FetchWithCredsOptions<T> = Omit<RequestInit, 'body'> & {
  schema?: z.ZodType<T>;
  body?: unknown;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
  status: number;
};

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

export async function fetchWithCreds<T = unknown>(
  path: string,
  options: FetchWithCredsOptions<T> = {},
): Promise<T> {
  const { schema, body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const baseUrl = baseURLFromEnv().replace(/\/$/, '');
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (
      typeof body === 'string' ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      isFormData(body)
    ) {
      requestBody = body as BodyInit;
    } else {
      requestBody = JSON.stringify(body);
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json');
      }
    }
  }

  if (requestBody && !requestHeaders.has('Content-Type') && !isFormData(body)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    body: requestBody,
    credentials: 'include',
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw await normalizeError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();
  if (schema) {
    return schema.parse(data);
  }

  return data as T;
}

async function normalizeError(response: Response): Promise<ApiError> {
  let code = `HTTP_${response.status}`;
  let message = response.statusText;

  try {
    const body = (await response.clone().json()) as {
      error?: { code?: string; message?: string };
      code?: string;
      message?: string;
    };

    if (body) {
      code = body.error?.code ?? body.code ?? code;
      message = body.error?.message ?? body.message ?? message;
    }
  } catch (error) {
    // ignore parse errors, fallback to defaults
  }

  return {
    error: {
      code,
      message,
    },
    status: response.status,
  };
}
