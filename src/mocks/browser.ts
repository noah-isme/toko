'use client';

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

export async function createWorker() {
  return setupWorker(...handlers);
}
