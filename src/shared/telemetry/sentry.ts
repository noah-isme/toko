import * as Sentry from '@sentry/nextjs';

import { recordBreadcrumb } from './qa-channel';

type MinimalSentryClient = Pick<typeof Sentry, 'addBreadcrumb' | 'captureException' | 'captureMessage'>;

let initialized = false;
let qaClient: MinimalSentryClient | null = null;

const canUseSentry = () => {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
};

const getQAClient = (): MinimalSentryClient => {
  if (qaClient) {
    return qaClient;
  }

  const addBreadcrumb: MinimalSentryClient['addBreadcrumb'] = (breadcrumb) => {
    recordBreadcrumb({
      category: breadcrumb?.category,
      message: breadcrumb?.message,
      level: breadcrumb?.level,
      data: breadcrumb?.data as Record<string, unknown> | undefined,
      type: breadcrumb?.type,
    });
  };

  const captureException: MinimalSentryClient['captureException'] = (exception, captureContext) => {
    recordBreadcrumb({
      category: 'exception',
      level: captureContext?.level ?? 'error',
      message: (exception instanceof Error && exception.message) || 'Unknown exception',
      data: {
        context: captureContext,
        name: exception instanceof Error ? exception.name : undefined,
      },
      type: 'exception',
    });
  };

  const captureMessage: MinimalSentryClient['captureMessage'] = (message, captureContext) => {
    recordBreadcrumb({
      category: 'message',
      level:
        (typeof captureContext === 'object' && captureContext && 'level' in captureContext
          ? (captureContext.level as string)
          : undefined) ?? 'info',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data: {
        context: captureContext as Record<string, unknown> | undefined,
      },
      type: 'message',
    });
  };

  qaClient = {
    addBreadcrumb,
    captureException,
    captureMessage,
  };

  return qaClient;
};

export const initSentry = () => {
  if (initialized) {
    return Sentry;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!canUseSentry()) {
    return null;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_NAME ?? 'toko',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enabled: true,
  });

  initialized = true;

  return Sentry;
};

export const getSentry = () => {
  if (!initialized) {
    initSentry();
  }

  if (initialized) {
    return Sentry;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return getQAClient();
};

export const captureSentryException = (
  exception: Parameters<typeof Sentry.captureException>[0],
  captureContext?: Parameters<typeof Sentry.captureException>[1],
) => {
  recordBreadcrumb({
    category: 'exception',
    level: captureContext?.level ?? 'error',
    message: exception instanceof Error ? exception.message : String(exception),
    data: captureContext?.extra as Record<string, unknown> | undefined,
    type: 'exception',
  });
  const client = getSentry();

  if (!client) {
    return undefined;
  }

  client.captureException?.(exception, captureContext);
};

export const captureSentryMessage = (
  message: Parameters<typeof Sentry.captureMessage>[0],
  captureContext?: Parameters<typeof Sentry.captureMessage>[1],
) => {
  recordBreadcrumb({
    category: 'message',
    level:
      (typeof captureContext === 'object' && captureContext && 'level' in captureContext
        ? (captureContext.level as string)
        : undefined) ?? 'info',
    message: typeof message === 'string' ? message : String(message),
    data: captureContext?.extra as Record<string, unknown> | undefined,
    type: 'message',
  });
  const client = getSentry();

  if (!client) {
    return undefined;
  }

  client.captureMessage?.(message, captureContext);
};

export { Sentry };

export const getSentryUser = (): { id?: string; username?: string; email?: string } | undefined =>
  undefined;
