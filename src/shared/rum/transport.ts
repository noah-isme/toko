import type { WebVitalMetric } from './vitals';

import { capturePosthogEvent, getPosthog } from '@/shared/telemetry/posthog';
import { captureSentryMessage, getSentryUser } from '@/shared/telemetry/sentry';

type MetricRating = WebVitalMetric['rating'];

type Viewport = {
  width: number;
  height: number;
};

type DeviceHints = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  prefersReducedMotion?: boolean;
  timezone?: string;
  locale?: string;
};

type NetworkInformationSummary = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

export type RumMetricPayload = {
  metric: WebVitalMetric['name'];
  value: number;
  delta: number;
  rating?: MetricRating;
  navigationType?: WebVitalMetric['navigationType'];
  url: string;
  pathname: string;
  viewport?: Viewport;
  deviceHints: DeviceHints;
  networkInfo?: NetworkInformationSummary;
  sessionId?: string;
  userId?: string;
  timestamp: number;
};

type RumSubscriber = (payload: RumMetricPayload) => void;

type Destination = 'posthog' | 'sentry';

const RUM_SESSION_KEY = 'toko:rum:sid';
const subscribers = new Set<RumSubscriber>();

let cachedSessionId: string | undefined;
let cachedRandomDecision: boolean | undefined;

type NavigatorConnection = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NavigatorExtended = Navigator & {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
  msDoNotTrack?: string;
  deviceMemory?: number;
};

const isBrowser = () => typeof window !== 'undefined';

const isTestEnv = () => process.env.NODE_ENV === 'test';

const safeNavigator = (): NavigatorExtended | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  return window.navigator as NavigatorExtended;
};

const readSampleRate = () => {
  const raw = process.env.NEXT_PUBLIC_RUM_SAMPLE;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return 0.1;
  }

  if (parsed <= 0) {
    return 0;
  }

  if (parsed >= 1) {
    return 1;
  }

  return parsed;
};

const hashStringToUnit = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return (hash >>> 0) / 0xffffffff;
};

const readSessionId = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  if (cachedSessionId) {
    return cachedSessionId;
  }

  try {
    let sessionId = window.sessionStorage.getItem(RUM_SESSION_KEY) ?? undefined;

    if (!sessionId) {
      sessionId =
        typeof window.crypto?.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

      window.sessionStorage.setItem(RUM_SESSION_KEY, sessionId);
    }

    cachedSessionId = sessionId;

    return sessionId;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[RUM] Unable to access sessionStorage for session id', error);
    }

    return undefined;
  }
};

const readUserId = (): string | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  try {
    const posthog = getPosthog();

    if (posthog && typeof posthog.get_distinct_id === 'function') {
      const distinct = posthog.get_distinct_id();

      if (distinct) {
        return distinct;
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[RUM] Failed to read PostHog distinct id', error);
    }
  }

  const sentryUser = getSentryUser();
  const identifier = sentryUser?.id ?? sentryUser?.username ?? sentryUser?.email;

  if (identifier) {
    return identifier;
  }

  return undefined;
};

const computeSamplingDecision = (sampleRate: number, sessionId?: string, userId?: string) => {
  if (sampleRate >= 1) {
    return true;
  }

  if (sampleRate <= 0) {
    return false;
  }

  const seededValue = userId ?? sessionId;

  if (seededValue) {
    return hashStringToUnit(seededValue) < sampleRate;
  }

  if (typeof cachedRandomDecision === 'undefined') {
    cachedRandomDecision = Math.random() < sampleRate;
  }

  return cachedRandomDecision;
};

const readViewport = (): Viewport | undefined => {
  if (!isBrowser()) {
    return undefined;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const readNetworkInformation = (): NetworkInformationSummary | undefined => {
  const navigatorInstance = safeNavigator();

  if (!navigatorInstance) {
    return undefined;
  }

  const connection =
    navigatorInstance.connection ??
    navigatorInstance.mozConnection ??
    navigatorInstance.webkitConnection;

  if (!connection) {
    return undefined;
  }

  const summary: NetworkInformationSummary = {
    effectiveType: connection.effectiveType,
    downlink: typeof connection.downlink === 'number' ? connection.downlink : undefined,
    rtt: typeof connection.rtt === 'number' ? connection.rtt : undefined,
    saveData: Boolean(connection.saveData),
  };

  if (
    typeof summary.effectiveType === 'undefined' &&
    typeof summary.downlink === 'undefined' &&
    typeof summary.rtt === 'undefined' &&
    !summary.saveData
  ) {
    return undefined;
  }

  return summary;
};

const readDeviceHints = (): DeviceHints => {
  const navigatorInstance = safeNavigator();
  const hints: DeviceHints = {};

  if (navigatorInstance) {
    if (typeof navigatorInstance.deviceMemory === 'number') {
      hints.deviceMemory = navigatorInstance.deviceMemory;
    }

    if (typeof navigatorInstance.hardwareConcurrency === 'number') {
      hints.hardwareConcurrency = navigatorInstance.hardwareConcurrency;
    }

    hints.locale = navigatorInstance.language ?? navigatorInstance.languages?.[0];
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      hints.timezone = timezone;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[RUM] Failed to read timezone', error);
    }
  }

  if (isBrowser() && typeof window.matchMedia === 'function') {
    try {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      hints.prefersReducedMotion = Boolean(query.matches);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[RUM] Failed to read prefers-reduced-motion', error);
      }
    }
  }

  return hints;
};

const hasDoNotTrack = () => {
  const navigatorInstance = safeNavigator();

  const globalWindowDnt = isBrowser()
    ? (window as Window & { doNotTrack?: string }).doNotTrack
    : undefined;

  const dnt = navigatorInstance?.doNotTrack ?? navigatorInstance?.msDoNotTrack ?? globalWindowDnt;

  return dnt === '1' || dnt === 'yes';
};

const resolveDestinations = (): Set<Destination> => {
  const destinations = new Set<Destination>();

  const raw = (process.env.NEXT_PUBLIC_RUM_DEST ?? '').toLowerCase();
  const hasPosthog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const hasSentry = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (raw === 'none') {
    return destinations;
  }

  if (raw === 'posthog') {
    if (hasPosthog) {
      destinations.add('posthog');
    }
    return destinations;
  }

  if (raw === 'sentry') {
    if (hasSentry) {
      destinations.add('sentry');
    }
    return destinations;
  }

  if (raw === 'both' || raw === '') {
    if (hasPosthog) {
      destinations.add('posthog');
    }
    if (hasSentry) {
      destinations.add('sentry');
    }
    return destinations;
  }

  // Unknown option, fallback to available defaults.
  if (hasPosthog) {
    destinations.add('posthog');
  }
  if (hasSentry) {
    destinations.add('sentry');
  }

  return destinations;
};

const notifySubscribers = (payload: RumMetricPayload) => {
  subscribers.forEach((subscriber) => {
    try {
      subscriber(payload);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[RUM] Subscriber threw an error', error);
      }
    }
  });
};

const buildPayload = (
  metric: WebVitalMetric,
  sessionId?: string,
  userId?: string,
): RumMetricPayload => ({
  metric: metric.name,
  value: metric.value,
  delta: metric.delta,
  rating: metric.rating,
  navigationType: metric.navigationType,
  url: isBrowser() ? window.location.href : '',
  pathname: isBrowser() ? window.location.pathname : '',
  viewport: readViewport(),
  deviceHints: readDeviceHints(),
  networkInfo: readNetworkInformation(),
  sessionId,
  userId,
  timestamp: Date.now(),
});

const shouldAttemptTransport = (destinations: Set<Destination>) => {
  if (!isBrowser()) {
    return false;
  }

  if (isTestEnv()) {
    return false;
  }

  if (hasDoNotTrack()) {
    return false;
  }

  return destinations.size > 0;
};

const sendToPosthog = (payload: RumMetricPayload) => {
  try {
    capturePosthogEvent('web_vital', payload);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[RUM] Failed to capture PostHog event', error);
    }
  }
};

const sendToSentry = (payload: RumMetricPayload) => {
  try {
    captureSentryMessage('web_vital', {
      level: 'info',
      extra: payload,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[RUM] Failed to capture Sentry message', error);
    }
  }
};

export const subscribeToRumMetrics = (subscriber: RumSubscriber): (() => void) => {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
};

export const reportWebVital = (metric: WebVitalMetric) => {
  const sessionId = readSessionId();
  const userId = readUserId();
  const sampleRate = readSampleRate();
  const payload = buildPayload(metric, sessionId, userId);

  notifySubscribers(payload);

  const destinations = resolveDestinations();

  if (!shouldAttemptTransport(destinations)) {
    return;
  }

  const shouldSend = computeSamplingDecision(sampleRate, sessionId, userId);

  if (!shouldSend) {
    return;
  }

  if (destinations.has('posthog')) {
    sendToPosthog(payload);
  }

  if (destinations.has('sentry')) {
    sendToSentry(payload);
  }
};

export const __resetRumInternalState = () => {
  subscribers.clear();
  cachedSessionId = undefined;
  cachedRandomDecision = undefined;
};
