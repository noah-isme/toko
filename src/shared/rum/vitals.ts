import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export type WebVitalMetric = Metric & {
  rating?: 'good' | 'needs-improvement' | 'poor';
};

type WebVitalHandler = (metric: WebVitalMetric) => void;

const handlers = new Set<WebVitalHandler>();

let started = false;
let hasWarned = false;

const dispatchMetric = (metric: Metric) => {
  handlers.forEach((handler) => {
    try {
      handler(metric as WebVitalMetric);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[RUM] Web vital handler failed', error);
      }
    }
  });
};

const startListening = () => {
  if (started) {
    return;
  }

  started = true;

  try {
    onCLS(dispatchMetric);
    onINP(dispatchMetric);
    onLCP(dispatchMetric);
    onFCP(dispatchMetric);
    onTTFB(dispatchMetric);
  } catch (error) {
    started = false;

    if (!hasWarned && process.env.NODE_ENV === 'development') {
      hasWarned = true;
      // eslint-disable-next-line no-console
      console.warn('[RUM] Failed to initialise web-vitals', error);
    }
  }
};

export const subscribeToWebVitals = (handler: WebVitalHandler): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  handlers.add(handler);

  if (!started) {
    const globalScope = window as Window & {
      __TOKO_RUM_WEB_VITALS_STARTED__?: boolean;
    };

    if (!globalScope.__TOKO_RUM_WEB_VITALS_STARTED__) {
      startListening();
      if (started) {
        globalScope.__TOKO_RUM_WEB_VITALS_STARTED__ = true;
      }
    } else {
      started = true;
    }
  }

  return () => {
    handlers.delete(handler);
  };
};

export const __resetWebVitalsForTests = () => {
  handlers.clear();
  started = false;
  hasWarned = false;
};
