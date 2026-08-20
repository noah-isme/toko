'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { isMock } from '@/shared/config/isMock';

// Development keeps the historical default of enabling mocks unless they are
// explicitly disabled. Production requires an explicit opt-in so a missing or
// misspelled deployment variable cannot silently serve fixture data.
const MSW_ENABLED =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_MOCKING === 'true'
    : process.env.NEXT_PUBLIC_API_MOCKING !== 'false';

type Props = {
  children: ReactNode;
};

export function MockServiceWorkerProvider({ children }: Props) {
  const [isReady, setIsReady] = useState(false);
  const shouldMock = typeof window !== 'undefined' && MSW_ENABLED && isMock();

  useEffect(() => {
    let cancelled = false;

    async function startMockWorker() {
      try {
        if (shouldMock) {
          const { createWorker } = await import('@/mocks/browser');
          const worker = await createWorker();
          await worker.start({ onUnhandledRequest: 'bypass' });
        }
      } catch (err) {
        // If the worker fails to boot, fall through to the real API rather
        // than leaving the app rendered as a blank screen.
        console.error('MSW boot failed, bypassing to the real API:', err);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    startMockWorker();

    return () => {
      cancelled = true;
    };
  }, [shouldMock]);

  if (shouldMock && !isReady) {
    return null;
  }

  return <>{children}</>;
}
