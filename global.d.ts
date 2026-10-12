import type messages from './messages/id.json';

import type { Locale } from '@/i18n/config';
import type { FORMATS } from '@/i18n/formats';

// Strict typing for next-intl (ADR-010): message keys come from the default `id` catalog,
// which `pnpm i18n:check` keeps in parity with `en`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
    Formats: typeof FORMATS;
  }
}
