import '@testing-library/jest-dom/vitest';

import { server } from './src/mocks/server';
import { isMock } from './src/shared/config/isMock';

const shouldEnableMocking = isMock();

if (shouldEnableMocking) {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} else {
  // eslint-disable-next-line no-console
  console.warn('MSW is disabled because NEXT_PUBLIC_API_URL is not set to "mock".');
}
