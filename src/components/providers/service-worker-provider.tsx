'use client';

import { useEffect, type ReactNode } from 'react';

import { isMock } from '@/shared/config/isMock';

const MSW_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== 'false';

type Props = {
  children: ReactNode;
};

export function MockServiceWorkerProvider({ children }: Props) {
  useEffect(() => {
    async function startMockWorker() {
      const isNonProduction = process.env.NODE_ENV !== 'production';
      if (isNonProduction && MSW_ENABLED && isMock()) {
        const { createWorker } = await import('@/mocks/browser');
        const worker = await createWorker();
        await worker.start({ onUnhandledRequest: 'bypass' });
      }
    }

    startMockWorker();
  }, []);

  return <>{children}</>;
}
