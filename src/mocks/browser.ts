'use client';

import { handlers } from './handlers';

export async function createWorker() {
  const moduleName = 'msw/browser';
  const { setupWorker } = (await import(moduleName)) as typeof import('msw/browser');
  return setupWorker(...handlers);
}
