const QA_CHANNEL_KEY = '__TOKO_QA_CHANNEL__';

export type TelemetryEntry = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
};

export type BreadcrumbEntry = {
  category?: string;
  message?: string;
  level?: string;
  data?: Record<string, unknown>;
  type?: string;
  timestamp: number;
};

export type QAChannel = {
  telemetry: TelemetryEntry[];
  breadcrumbs: BreadcrumbEntry[];
};

type QAEnabledGlobal = typeof globalThis & {
  [QA_CHANNEL_KEY]?: QAChannel;
};

declare global {
  // eslint-disable-next-line no-var
  var __TOKO_QA_CHANNEL__?: QAChannel;

  interface Window {
    __TOKO_QA_CHANNEL__?: QAChannel;
  }
}

function getScope(): QAEnabledGlobal {
  return globalThis as QAEnabledGlobal;
}

function ensureChannel(): QAChannel {
  const scope = getScope();
  if (!scope[QA_CHANNEL_KEY]) {
    scope[QA_CHANNEL_KEY] = { telemetry: [], breadcrumbs: [] };
  }
  return scope[QA_CHANNEL_KEY]!;
}

function trim(list: Array<unknown>, maxEntries = 120) {
  while (list.length > maxEntries) {
    list.shift();
  }
}

export function recordTelemetryEvent(event: string, properties?: Record<string, unknown>) {
  const channel = ensureChannel();
  channel.telemetry.push({ event, properties, timestamp: Date.now() });
  trim(channel.telemetry);
}

export function recordBreadcrumb(entry: Omit<BreadcrumbEntry, 'timestamp'>) {
  const channel = ensureChannel();
  channel.breadcrumbs.push({ ...entry, timestamp: Date.now() });
  trim(channel.breadcrumbs);
}

export function resetQAChannel() {
  const scope = getScope();
  scope[QA_CHANNEL_KEY] = { telemetry: [], breadcrumbs: [] };
}

export function getQAChannelSnapshot(): QAChannel {
  const channel = ensureChannel();
  return {
    telemetry: [...channel.telemetry],
    breadcrumbs: [...channel.breadcrumbs],
  };
}
