import type { Page, TestInfo } from '@playwright/test';

import { installAdminSession } from './auth.fixture';

/**
 * Signs the page in as the mock admin and pins the mock API to one
 * `mockSessionId` cookie session, unique per test and repeat. The mock API
 * keeps admin state (products, orders) per session, so every test starts from
 * the seeded fixtures and its writes survive reloads without leaking into
 * other tests or parallel workers.
 */
export async function installIsolatedAdminSession(page: Page, testInfo: TestInfo) {
  await installAdminSession(page);
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3000';
  const sessionId = [
    'admin-e2e',
    testInfo.testId,
    testInfo.repeatEachIndex,
    testInfo.retry,
    testInfo.workerIndex,
  ].join('-');
  await page.context().addCookies([{ name: 'mockSessionId', value: sessionId, url: baseURL }]);
  return sessionId;
}
