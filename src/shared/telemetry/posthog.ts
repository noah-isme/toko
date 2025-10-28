import posthog from 'posthog-js';

type PostHogClient = typeof posthog;

let initialized = false;

const canUseTelemetry = () => {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  return Boolean(
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY,
  );
};

export const initPosthog = (): PostHogClient | null => {
  if (!canUseTelemetry()) {
    return null;
  }

  if (initialized) {
    return posthog;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
    property_blacklist: ['$ip'],
  });

  initialized = true;

  return posthog;
};

export const getPosthog = (): PostHogClient | null => {
  if (!initialized) {
    return initPosthog();
  }

  return canUseTelemetry() ? posthog : null;
};

export const capturePosthogEvent = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  const client = getPosthog();

  if (!client) {
    return;
  }

  client.capture(event, properties);
};

