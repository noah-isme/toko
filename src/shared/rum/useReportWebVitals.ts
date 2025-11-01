'use client';

import { useEffect } from 'react';

import { reportWebVital } from './transport';
import { subscribeToWebVitals } from './vitals';

const GLOBAL_FLAG = '__TOKO_RUM_INITIALISED__';

declare global {
  interface Window {
    __TOKO_RUM_INITIALISED__?: boolean;
  }
}

export const useReportWebVitals = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const alreadyInitialised = Boolean(window[GLOBAL_FLAG]);

    if (alreadyInitialised) {
      return undefined;
    }

    window[GLOBAL_FLAG] = true;

    const unsubscribe = subscribeToWebVitals(reportWebVital);

    return () => {
      unsubscribe();
      window[GLOBAL_FLAG] = false;
    };
  }, []);
};
