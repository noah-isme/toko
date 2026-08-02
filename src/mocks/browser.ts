'use client';

import { handlers } from './handlers';

export async function createWorker() {
  if (typeof window === 'undefined') {
    return {
      start: () => Promise.resolve(),
      stop: () => {},
    };
  }
  const msw = await import('msw');
  const { setupWorker } = msw as any;
  return setupWorker(...handlers);
}
