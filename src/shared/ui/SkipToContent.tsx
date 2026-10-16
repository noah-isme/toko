'use client';

import { useTranslations } from 'next-intl';

export function SkipToContent() {
  const t = useTranslations('common');

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:m-2 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
    >
      {t('skipToContent')}
    </a>
  );
}
