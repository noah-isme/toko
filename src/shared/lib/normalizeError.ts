import { ZodError } from 'zod';

type ErrorWithMessage = { message?: string | undefined | null };

type HttpErrorLike = {
  status?: number;
  statusText?: string;
  data?: unknown;
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
  };
};

type MaybeError = ErrorWithMessage &
  HttpErrorLike & {
    error?: unknown;
  };

function extractMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as ErrorWithMessage).message === 'string'
  ) {
    const message = (value as ErrorWithMessage).message;
    if (message && message.trim().length > 0) {
      return message;
    }
  }

  return null;
}

function getDataMessage(data: unknown): string | null {
  if (!data) return null;

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    const candidates = ['message', 'error', 'detail', 'title'] as const;

    for (const key of candidates) {
      const value = (data as Record<string, unknown>)[key];
      const message = extractMessage(value);
      if (message) {
        return message;
      }
    }
  }

  return null;
}

const DEFAULT_ERROR_MESSAGE = 'Terjadi kesalahan. Coba lagi.';

export function normalizeError(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    if (firstIssue?.message) {
      return firstIssue.message;
    }
    return DEFAULT_ERROR_MESSAGE;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message) {
      return message;
    }
  }

  if (error && typeof error === 'object') {
    const maybeError = error as MaybeError;

    const responseMessage = maybeError.response && getDataMessage(maybeError.response.data);
    if (responseMessage) {
      return responseMessage;
    }

    const dataMessage = getDataMessage(maybeError.data);
    if (dataMessage) {
      return dataMessage;
    }

    if (maybeError.status && maybeError.statusText) {
      return `${maybeError.status} ${maybeError.statusText}`;
    }

    const message = extractMessage(error);
    if (message) {
      return message;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}
