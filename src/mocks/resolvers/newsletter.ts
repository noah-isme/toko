import { sessionValue } from './session';
import type { MockResolver, MockResult } from './types';

/**
 * `POST newsletter/subscribe`, mirroring toko-api internal/newsletter: the
 * address is trimmed and lower-cased, a malformed one is a 400
 * `VALIDATION_ERROR`, and subscribing again is an idempotent upsert that
 * answers 200 with the same body. The endpoint is not in openapi.yaml yet
 * (docs/STATUS.md). Shared by `handlers.newsletter.ts` (one global list) and the
 * `/api/v1` route (one list per mock session).
 */
export const NEWSLETTER_SUCCESS_MESSAGE = 'Thank you for subscribing to our newsletter!';

// Bare `local@domain`, roughly what Go's net/mail.ParseAddress accepts without a display name.
const EMAIL_RE = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+$/;

function validationError(message: string): MockResult {
  return { status: 400, error: { code: 'VALIDATION_ERROR', message } };
}

export function subscribeNewsletter(subscribers: Set<string>, body: unknown): MockResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, error: { code: 'INVALID_BODY', message: 'invalid request body' } };
  }
  const raw = (body as { email?: unknown }).email;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!email) return validationError('email is required');
  if (!EMAIL_RE.test(email)) return validationError('invalid email address');

  subscribers.add(email);
  return { data: { message: NEWSLETTER_SUCCESS_MESSAGE, email, status: 'SUBSCRIBED' } };
}

export const resolveNewsletter: MockResolver = ({ path, method, body, sessionId }) => {
  if (path !== 'newsletter/subscribe' || method !== 'POST') return undefined;
  return subscribeNewsletter(
    sessionValue('newsletter', sessionId, () => new Set<string>()),
    body,
  );
};
