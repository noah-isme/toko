import { env } from "@/env";
import { type ZodSchema } from "zod";

export type ApiRequestOptions = {
  searchParams?: Record<string, string | number | boolean | undefined>;
  init?: RequestInit;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const toURL = (path: string, searchParams?: ApiRequestOptions["searchParams"]) => {
  const url = new URL(path.replace(/^\//, ""), ensureTrailingSlash(env.NEXT_PUBLIC_API_URL));

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url;
};

const ensureTrailingSlash = (value: string) => (value.endsWith("/") ? value : `${value}/`);

async function parseJson<T>(response: Response, schema: ZodSchema<T>): Promise<T> {
  const data = await response.json();
  return schema.parse(data);
}

async function handleError(response: Response) {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  throw new ApiClientError(`Request failed with status ${response.status}`, response.status, body);
}

export async function apiGet<T>(path: string, schema: ZodSchema<T>, options?: ApiRequestOptions) {
  const url = toURL(path, options?.searchParams);
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    ...options?.init,
    method: "GET",
  });

  if (!response.ok) {
    await handleError(response);
  }

  if (response.status === 204) {
    return schema.parse({});
  }

  return parseJson(response, schema);
}

export const apiClient = {
  get: apiGet,
};
