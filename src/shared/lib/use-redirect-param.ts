'use client';

import { useSyncExternalStore } from 'react';

import { safeRedirectPath } from './safe-redirect';

/** Reads `?redirect=` from the current URL, validated; `/` when absent or unsafe. */
export function readRedirectParam(): string {
  if (typeof window === 'undefined') return '/';
  return safeRedirectPath(new URLSearchParams(window.location.search).get('redirect'));
}

/**
 * Builds a link to another auth page (`/login`, `/register`) that keeps the
 * post-sign-in target, so switching between sign-in and sign-up does not lose
 * the page the shopper came from.
 */
export function withRedirectParam(path: string, redirect: string): string {
  return redirect === '/' ? path : `${path}?redirect=${encodeURIComponent(redirect)}`;
}

const subscribe = () => () => undefined;
const serverSnapshot = () => '/';

/**
 * The validated `?redirect=` for rendering (links). The server render and the
 * first client render both see `/`, so there is no hydration mismatch and no
 * Suspense boundary is needed (unlike `useSearchParams`).
 */
export function useRedirectParam(): string {
  return useSyncExternalStore(subscribe, readRedirectParam, serverSnapshot);
}
