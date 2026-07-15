'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { isMock } from '@/shared/config/isMock';

const MSW_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== 'false';

type Props = {
  children: ReactNode;
};

export function MockServiceWorkerProvider({ children }: Props) {
  const [isReady, setIsReady] = useState(false);
  const shouldMock =
    typeof window !== 'undefined' &&
    process.env.NODE_ENV !== 'production' &&
    MSW_ENABLED &&
    isMock();

  useEffect(() => {
    async function startMockWorker() {
      if (shouldMock) {
        const { createWorker } = await import('@/mocks/browser');
        const worker = await createWorker();
        await worker.start({ onUnhandledRequest: 'bypass' });
      }
      setIsReady(true);
    }

    startMockWorker();
  }, [shouldMock]);

  if (shouldMock && !isReady) {
    return null;
  }

  return <>{children}</>;
}
