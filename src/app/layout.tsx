import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { ReactNode, Suspense } from 'react';

import './globals.css';

import { AppInitializer } from '@/components/providers/AppInitializer';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/query-provider';
import { MockServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { SerwistProvider } from '@/components/providers/serwist-provider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { RouteFocusHandler } from '@/shared/lib/useRouteFocus';
import DevVitalsOverlay from '@/shared/rum/DevVitalsOverlay';
import { metadataBase, ogImageUrl, siteUrl } from '@/shared/seo/seo';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { SkipToContent } from '@/shared/ui/SkipToContent';
import { Toaster } from '@/shared/ui/toast';

const appName = 'toko';
// The service worker (ADR-009) is production-only by default so it never
// competes with MSW's mockServiceWorker.js in development. Set
// NEXT_PUBLIC_SW_DEV=true to opt in locally.
const SERVICE_WORKER_ENABLED =
  process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SW_DEV === 'true';

// No `alternates` here: they would be inherited by every page that sets none, so each page
// declares its own hreflang via `localeAlternates()`.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'seo.site' });
  const description = t('description');
  const ogImage = ogImageUrl(locale);

  return {
    metadataBase,
    title: {
      default: appName,
      template: `%s · ${appName}`,
    },
    description,
    icons: {
      icon: [{ url: '/favicon.ico' }],
      apple: [{ url: '/apple-touch-icon.png' }],
    },
    manifest: '/manifest.json',
    openGraph: {
      type: 'website',
      url: siteUrl,
      title: appName,
      siteName: appName,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: appName,
      description,
      images: [ogImage],
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Resolved by src/i18n/request.ts from the proxy's x-toko-locale header, then the cookie
  // (ADR-010). Reading it makes every route dynamic, which is accepted.
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider>
          <SkipToContent />
          <MockServiceWorkerProvider>
            <Suspense fallback={null}>
              <RouteFocusHandler />
            </Suspense>
            <ErrorBoundary>
              <QueryProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <AppInitializer />
                    <div
                      id="main-content"
                      tabIndex={-1}
                      role="main"
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {children}
                    </div>
                  </ThemeProvider>
                </AuthProvider>
              </QueryProvider>
            </ErrorBoundary>
          </MockServiceWorkerProvider>
          <Suspense fallback={null}>
            <DevVitalsOverlay />
          </Suspense>
          <Toaster />
          {SERVICE_WORKER_ENABLED ? (
            // reloadOnOnline=false keeps in-progress form state (checkout) on
            // reconnect; cacheOnNavigation=false keeps documents out of caches.
            <SerwistProvider
              swUrl="/serwist/sw.js"
              reloadOnOnline={false}
              cacheOnNavigation={false}
            />
          ) : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
