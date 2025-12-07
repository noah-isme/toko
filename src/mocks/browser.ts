'use client';

import { handlers } from './handlers';

export async function createWorker() {
  const { setupWorker } = (await import('msw/browser')) as typeof import('msw/browser');
  return setupWorker(...handlers);
}
