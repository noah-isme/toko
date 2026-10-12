import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { TEST_MESSAGES } from './next-intl-mock';

import type { Locale } from '@/i18n/config';
import { FORMATS, TIME_ZONE } from '@/i18n/formats';

interface RenderWithIntlOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: Locale;
  wrapper?: (props: { children: ReactNode }) => ReactElement;
}

/**
 * Renders `ui` inside the real `NextIntlClientProvider` with the real catalog for `locale`
 * (default `id`). Use it for `en` assertions; the global mock already renders `id` without it.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = 'id', wrapper: Wrapper, ...options }: RenderWithIntlOptions = {},
) {
  function IntlWrapper({ children }: { children: ReactNode }) {
    const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;
    return (
      <NextIntlClientProvider
        locale={locale}
        messages={TEST_MESSAGES[locale]}
        timeZone={TIME_ZONE}
        formats={FORMATS}
      >
        {content}
      </NextIntlClientProvider>
    );
  }

  return render(ui, { wrapper: IntlWrapper, ...options });
}
