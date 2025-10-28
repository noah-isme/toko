'use client';

import { useEffect, type ReactNode } from 'react';

const MSW_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== 'false';

type Props = {
  children: ReactNode;
};

export function MockServiceWorkerProvider({ children }: Props) {
  useEffect(() => {
    async function startMockWorker() {
      if (process.env.NODE_ENV === 'development' && MSW_ENABLED) {
        const { createWorker } = await import('@/mocks/browser');
        const worker = await createWorker();
        await worker.start({ onUnhandledRequest: 'bypass' });
      }
    }

    startMockWorker();
  }, []);

  return <>{children}</>;
}
