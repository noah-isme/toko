# ADR 010: i18n with next-intl, Cookie and Request-Header Locale

## Status

Accepted

## Context

The storefront UI mixes Indonesian and English strings, the root layout hard-coded `<html lang>`, and currency/date formatting lived in ad-hoc helpers (`src/lib/api/utils.ts`, duplicated in `src/entities/admin/format.ts`). The proxy (`src/proxy.ts`) already serves `/en/...` by rewriting to the unprefixed route and storing a `toko-locale` cookie; `id` is the default and stays unprefixed. Earlier zh/ja/ko prefixes were dropped and now redirect.

next-intl 4 supports both `[locale]` segment routing and a mode "without i18n routing", where `src/i18n/request.ts` decides the locale per request.

## Decision

- **Library:** `next-intl` (plugin composed as `withSerwist(withNextIntl(nextConfig))` in `next.config.mjs`, Turbopack build).
- **Locales:** exactly `id` (default, unprefixed URLs) and `en` (`/en/...`). Legacy `/zh`, `/ja`, `/ko` prefixes are 308-redirected to the unprefixed page and a stale cookie is reset to `id`. Constants live in `src/i18n/config.ts`.
- **No `[locale]` segment.** The proxy forwards the resolved locale as the request header `x-toko-locale` (`LOCALE_HEADER`) on every rewrite/next response and also sets the cookie. `src/i18n/request.ts` resolves the locale from an explicit override, then that header, then the `toko-locale` cookie, then `DEFAULT_LOCALE`. The header makes `GET /en/...` render English (`<html lang="en">`) on the very first request, before the cookie exists.
- **Root layout:** `const locale = await getLocale()`, `<html lang={locale}>`, and `NextIntlClientProvider` (inherits messages, time zone and formats from the request config). `src/app/global-error.tsx` stays outside next-intl and renders hard-coded bilingual text (id first), because it replaces the root layout.
- **Catalogs:** `messages/id.json` and `messages/en.json`, namespaces `common`, `nav`, `footer`, `catalog`, `product`, `cart`, `checkout`, `auth`, `account`, `errors`, `notFound`, `seo`, `admin`. `id` values render exactly the text the UI showed before migration (ICU-escaped `'`, `{`, `}`). `pnpm i18n:check` (`scripts/i18n/check-messages.mjs`, also part of `pnpm lint`) fails if the key sets differ or a value is empty. Message keys are type-checked through `AppConfig` in `global.d.ts`.
- **Admin included:** admin strings move into the `admin` namespace after the storefront, with real Indonesian in `id.json`.
- **Formatting:** time zone `Asia/Jakarta`; named formats (`currency` = IDR without decimals, `short`/`long`/`dateTime` dates) in `src/i18n/formats.ts`, shared by next-intl and `src/shared/i18n/format.ts` (`formatCurrency(amount, locale)`, `formatDate`). Output: `Rp 1.000.000` (id, identical to the legacy helper) and `IDR 1,000,000` (en).
- **Tests:** `vitest.setup.ts` mocks `next-intl` around the real module: hooks delegate to the real ones inside a provider and fall back to the `id` catalog without one; `next-intl/server` getters render from the real catalogs (default `id`). `tests/utils/renderWithIntl.tsx` renders with the real `NextIntlClientProvider` for `en` assertions.

## Rationale

next-intl's `[locale]` routing with `localePrefix: 'as-needed'` would also keep `id` unprefixed, so URLs were not the deciding factor. The cookie and request-header design was chosen because it avoids moving the whole route tree (storefront, admin, error and not-found files) under `app/[locale]`, while the existing proxy already provides prefixed URLs. The dynamic rendering it causes was accepted.

## Consequences

- **Negative (accepted):** reading the header/cookie in `getLocale()` makes every route dynamic, including `/terms`, `/privacy` and `/offline`. This is an accepted TTFB regression versus static shells; ISR for catalog routes is a ROADMAP follow-up.
- **Negative:** the service worker precaches `/offline` once per worker revision, in whatever locale the install request resolves to (the visitor's cookie, else `id`), so the offline page is single-locale and does not follow a later language switch until the next worker update.
- **Positive:** one locale source for server and client; `<html lang>` is correct on the first response; formatting is consistent across hooks and plain helpers.
- **Positive:** existing tests keep their Indonesian assertions through the global mock; `en` behaviour is tested with `renderWithIntl`.
- Re-introducing a locale means adding it to `LOCALES`, adding a catalog that passes `i18n:check`, and removing it from `LEGACY_LOCALES`.
