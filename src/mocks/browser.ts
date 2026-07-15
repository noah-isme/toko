'use client';

import { handlers } from './handlers';

export async function createWorker() {
  if (typeof window === 'undefined') {
    return {
      start: () => Promise.resolve(),
      stop: () => {},
    };
  }
  const { setupWorker } = await import('msw/browser');
  return setupWorker(...handlers);
}
