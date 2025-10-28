import * as Sentry from '@sentry/nextjs';

let initialized = false;

const canUseSentry = () => {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
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

  return initialized ? Sentry : null;
};

export const captureSentryException = (
  exception: Parameters<typeof Sentry.captureException>[0],
  captureContext?: Parameters<typeof Sentry.captureException>[1],
) => {
  const client = getSentry();

  if (!client) {
    return undefined;
  }

  client.captureException(exception, captureContext);
};

export const captureSentryMessage = (
  message: Parameters<typeof Sentry.captureMessage>[0],
  captureContext?: Parameters<typeof Sentry.captureMessage>[1],
) => {
  const client = getSentry();

  if (!client) {
    return undefined;
  }

  client.captureMessage(message, captureContext);
};

export { Sentry };
