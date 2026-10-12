'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { authValidationKey } from './schemas';

/**
 * Returns a function that renders an auth form error in the active locale. Schema messages map
 * to `auth.validation` keys; any other message (for example an API error) is shown as is.
 */
export function useAuthErrorMessage() {
  const t = useTranslations('auth.validation');
  return useCallback(
    (message: string | undefined) => {
      if (!message) return message;
      const key = authValidationKey(message);
      return key ? t(key) : message;
    },
    [t],
  );
}
