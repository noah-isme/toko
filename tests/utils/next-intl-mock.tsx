/**
 * Global Vitest stand-ins for `next-intl` and `next-intl/server` (wired in `vitest.setup.ts`).
 *
 * - Everything is the real module (`vi.importActual`); only the hooks, the providers and the
 *   server getters are wrapped.
 * - Inside a `NextIntlClientProvider` (e.g. `renderWithIntl(ui, { locale: 'en' })`) the hooks
 *   delegate to the real ones, so tests see exactly what the app renders for that locale.
 * - Without a provider (most component tests) they fall back to the `id` catalog, so components
 *   render today's Indonesian UI without every test having to wrap them.
 */

import type * as NextIntl from 'next-intl';
import type * as NextIntlServer from 'next-intl/server';
import { createContext, useContext, type ComponentProps } from 'react';

import enMessages from '../../messages/en.json';
import idMessages from '../../messages/id.json';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../../src/i18n/config';
import { FORMATS, TIME_ZONE } from '../../src/i18n/formats';

type NextIntlModule = typeof NextIntl;
type NextIntlServerModule = typeof NextIntlServer;

export const TEST_MESSAGES = { id: idMessages, en: enMessages } as const;

/** Marks a subtree as rendered inside a (mocked) next-intl provider. */
const IntlPresenceContext = createContext(false);

function resolveLocale(locale: unknown): Locale {
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function createNextIntlMock(actual: NextIntlModule): NextIntlModule {
  const translators = new Map<string, unknown>();
  const formatters = new Map<Locale, ReturnType<NextIntlModule['createFormatter']>>();

  function fallbackTranslator(namespace?: string) {
    const key = namespace ?? '';
    if (!translators.has(key)) {
      translators.set(
        key,
        actual.createTranslator({
          locale: DEFAULT_LOCALE,
          messages: TEST_MESSAGES[DEFAULT_LOCALE],
          namespace: namespace as never,
          timeZone: TIME_ZONE,
          formats: FORMATS,
        }),
      );
    }
    return translators.get(key);
  }

  function fallbackFormatter(locale: Locale = DEFAULT_LOCALE) {
    let formatter = formatters.get(locale);
    if (!formatter) {
      formatter = actual.createFormatter({ locale, timeZone: TIME_ZONE, formats: FORMATS });
      formatters.set(locale, formatter);
    }
    return formatter;
  }

  function NextIntlClientProvider(props: ComponentProps<NextIntlModule['NextIntlClientProvider']>) {
    return (
      <IntlPresenceContext.Provider value>
        <actual.NextIntlClientProvider {...props} />
      </IntlPresenceContext.Provider>
    );
  }

  function IntlProvider(props: ComponentProps<NextIntlModule['IntlProvider']>) {
    return (
      <IntlPresenceContext.Provider value>
        <actual.IntlProvider {...props} />
      </IntlPresenceContext.Provider>
    );
  }

  // Whether a provider is present never changes for a mounted component, so the
  // hook call order stays stable across renders.
  const useTranslations = ((namespace?: string) => {
    const hasProvider = useContext(IntlPresenceContext);
    if (hasProvider) return actual.useTranslations(namespace as never);
    return fallbackTranslator(namespace);
  }) as NextIntlModule['useTranslations'];

  const useFormatter = (() => {
    const hasProvider = useContext(IntlPresenceContext);
    if (hasProvider) return actual.useFormatter();
    return fallbackFormatter();
  }) as NextIntlModule['useFormatter'];

  const useLocale = (() => {
    const hasProvider = useContext(IntlPresenceContext);
    if (hasProvider) return actual.useLocale();
    return DEFAULT_LOCALE;
  }) as NextIntlModule['useLocale'];

  const useMessages = (() => {
    const hasProvider = useContext(IntlPresenceContext);
    if (hasProvider) return actual.useMessages();
    return TEST_MESSAGES[DEFAULT_LOCALE];
  }) as NextIntlModule['useMessages'];

  const useTimeZone = (() => {
    const hasProvider = useContext(IntlPresenceContext);
    if (hasProvider) return actual.useTimeZone();
    return TIME_ZONE;
  }) as NextIntlModule['useTimeZone'];

  return {
    ...actual,
    NextIntlClientProvider,
    IntlProvider,
    useTranslations,
    useFormatter,
    useLocale,
    useMessages,
    useTimeZone,
  };
}

type ServerLocaleArg = { locale?: string; namespace?: string } | string | undefined;

function serverArgs(arg: ServerLocaleArg) {
  if (typeof arg === 'string' || arg === undefined) {
    return { locale: DEFAULT_LOCALE, namespace: arg };
  }
  return { locale: resolveLocale(arg.locale), namespace: arg.namespace };
}

/**
 * `next-intl/server` resolves to its client build under Vitest, where the getters throw.
 * The stand-ins render the requested locale (default `id`) from the real catalogs.
 */
export function createNextIntlServerMock(
  actual: NextIntlServerModule,
  core: NextIntlModule,
): NextIntlServerModule {
  const getTranslations = (async (arg?: ServerLocaleArg) => {
    const { locale, namespace } = serverArgs(arg);
    return core.createTranslator({
      locale,
      messages: TEST_MESSAGES[locale],
      namespace: namespace as never,
      timeZone: TIME_ZONE,
      formats: FORMATS,
    });
  }) as NextIntlServerModule['getTranslations'];

  const getFormatter = (async (arg?: { locale?: string }) =>
    core.createFormatter({
      locale: resolveLocale(arg?.locale),
      timeZone: TIME_ZONE,
      formats: FORMATS,
    })) as NextIntlServerModule['getFormatter'];

  const getMessages = (async (arg?: { locale?: string }) =>
    TEST_MESSAGES[resolveLocale(arg?.locale)]) as NextIntlServerModule['getMessages'];

  return {
    ...actual,
    // Identity, so `src/i18n/request.ts` can be imported and its config function tested.
    getRequestConfig: ((create: unknown) => create) as NextIntlServerModule['getRequestConfig'],
    getTranslations,
    getFormatter,
    getMessages,
    getLocale: (async () => DEFAULT_LOCALE) as NextIntlServerModule['getLocale'],
    getTimeZone: (async () => TIME_ZONE) as NextIntlServerModule['getTimeZone'],
    getNow: (async () => new Date()) as NextIntlServerModule['getNow'],
    setRequestLocale: () => {},
  };
}
