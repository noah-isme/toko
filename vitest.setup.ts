import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

import { server } from './src/mocks/server';
import { isMock } from './src/shared/config/isMock';

// `server-only` throws when imported outside a React Server environment; tests
// exercise server modules (e.g. src/lib/api/server.ts) directly.
vi.mock('server-only', () => ({}));

// Unmount any rendered React trees after every test. Without this, a component
// rendered by one test lingers in the shared jsdom document and its text can be
// matched by a later test — a subtle, order-dependent source of failures.
afterEach(() => {
  cleanup();
});

const shouldEnableMocking = isMock();

if (shouldEnableMocking) {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    if (typeof document !== 'undefined') {
      document.cookie = 'X-CSRF-Token=mock-csrf-token; Path=/; SameSite=Lax';
    }
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} else {
  console.warn('MSW is disabled because NEXT_PUBLIC_API_URL is not set to "mock".');
}
