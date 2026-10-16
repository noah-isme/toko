import { sessionValue } from './session';
import type { MockResolver, MockResult } from './types';

/**
 * Web push endpoints (docs/contracts/push.md), shared by the MSW handlers
 * (`handlers.push.ts`) and the `/api/v1` route. MSW keeps one global state, the
 * route one per mock session.
 *
 * Two responses carry the client's field names next to the contract's, because
 * `src/entities/web-push/api.ts` parses different shapes than openapi.yaml
 * documents: the VAPID key is `public_key` on the wire but read as `publicKey`,
 * and `PATCH push/preferences` returns `PushPreferences` but is parsed as
 * `{ success, message }`. Serving both keeps the mock valid for either side.
 */

/** A syntactically valid (uncompressed P-256, base64url) public key; never used to sign. */
export const MOCK_VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

const PREFERENCE_TYPES = ['order_update', 'promo_updates', 'stock_updates'] as const;

export type MockPushState = {
  enabled: boolean;
  types: Record<string, boolean>;
  /** Subscribed browser endpoints. */
  endpoints: string[];
};

export function seedPushState(): MockPushState {
  return {
    enabled: false,
    types: { order_update: true, promo_updates: false, stock_updates: false },
    endpoints: [],
  };
}

function preferencesView(state: MockPushState) {
  const view: { enabled: boolean; types: Record<string, boolean>; endpoint?: string } = {
    enabled: state.enabled,
    types: { ...state.types },
  };
  const endpoint = state.endpoints.at(-1);
  if (endpoint) view.endpoint = endpoint;
  return view;
}

function missingFields(message: string): MockResult {
  return { status: 400, error: { code: 'MISSING_FIELDS', message } };
}

export function getVapidKey() {
  return { public_key: MOCK_VAPID_PUBLIC_KEY, publicKey: MOCK_VAPID_PUBLIC_KEY };
}

export function getPushPreferences(state: MockPushState) {
  return preferencesView(state);
}

/** `PATCH push/preferences`: omitted fields keep their value; unknown type keys are ignored. */
export function updatePushPreferences(state: MockPushState, body: unknown): MockResult {
  const input = (body && typeof body === 'object' ? body : {}) as {
    enabled?: unknown;
    types?: unknown;
  };
  if (typeof input.enabled === 'boolean') state.enabled = input.enabled;
  if (input.types && typeof input.types === 'object') {
    for (const key of PREFERENCE_TYPES) {
      const value = (input.types as Record<string, unknown>)[key];
      if (typeof value === 'boolean') state.types[key] = value;
    }
  }
  return { success: true, message: 'Preferensi notifikasi disimpan', ...preferencesView(state) };
}

/**
 * `POST push/subscription`. The contract body is `{ endpoint, keys }`; the
 * client sends `{ subscription: { endpoint, keys }, userAgent }`, so both are read.
 */
export function subscribePush(state: MockPushState, body: unknown): MockResult {
  type SubscriptionBody = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const input = (body && typeof body === 'object' ? body : {}) as SubscriptionBody & {
    subscription?: SubscriptionBody;
  };
  const { endpoint, keys } = input.subscription ?? input;
  if (typeof endpoint !== 'string' || !endpoint || !keys?.p256dh || !keys?.auth) {
    return missingFields('endpoint and keys are required');
  }
  if (!state.endpoints.includes(endpoint)) state.endpoints.push(endpoint);
  state.enabled = true;
  return { success: true, message: 'Notifikasi push diaktifkan' };
}

/** `DELETE push/subscription[?endpoint=]`: no endpoint removes every subscription. */
export function unsubscribePush(state: MockPushState, endpoint: string | null): MockResult {
  state.endpoints = endpoint ? state.endpoints.filter((e) => e !== endpoint) : [];
  if (state.endpoints.length === 0) state.enabled = false;
  return { success: true, message: 'Notifikasi push dinonaktifkan' };
}

/** `POST push/send-test`: debug only; nothing is delivered by the mock. */
export function sendTestPush(state: MockPushState): MockResult {
  if (state.endpoints.length === 0) {
    return missingFields('no push subscription for this user');
  }
  return { success: true, message: 'Notifikasi uji dikirim' };
}

export const resolvePush: MockResolver = ({ path, method, body, sessionId, searchParams }) => {
  if (!path.startsWith('push/')) return undefined;
  const state = () => sessionValue('push', sessionId, seedPushState);

  if (path === 'push/vapid-key' && method === 'GET') return getVapidKey();
  if (path === 'push/preferences') {
    if (method === 'GET') return getPushPreferences(state());
    if (method === 'PATCH') return updatePushPreferences(state(), body);
  }
  if (path === 'push/subscription') {
    if (method === 'POST') return subscribePush(state(), body);
    if (method === 'DELETE') return unsubscribePush(state(), searchParams.get('endpoint'));
  }
  if (path === 'push/send-test' && method === 'POST') return sendTestPush(state());
  return undefined;
};
