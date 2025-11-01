import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode, Suspense } from 'react';

import './globals.css';

import { QueryProvider } from '@/components/providers/query-provider';
import { MockServiceWorkerProvider } from '@/components/providers/service-worker-provider';
import { cn } from '@/lib/utils';
import { RouteFocusHandler } from '@/shared/lib/useRouteFocus';
import DevVitalsOverlay from '@/shared/rum/DevVitalsOverlay';
import { abs, metadataBase, siteUrl } from '@/shared/seo/seo';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { SkipToContent } from '@/shared/ui/SkipToContent';
import { Toaster } from '@/shared/ui/toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const appName = 'toko';
const defaultDescription = 'Modern modular storefront for the toko e-commerce experience.';

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: appName,
    template: '%s · toko',
  },
  description: defaultDescription,
  icons: {
    icon: [{ url: '/favicon.ico' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: appName,
    siteName: appName,
    description: defaultDescription,
    images: [
      {
        url: abs('/api/og'),
        width: 1200,
        height: 630,
        alt: 'toko default preview image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: defaultDescription,
    images: [abs('/api/og')],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <SkipToContent />
        <MockServiceWorkerProvider>
          <Suspense fallback={null}>
            <RouteFocusHandler />
          </Suspense>
          <ErrorBoundary>
            <QueryProvider>
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
            </QueryProvider>
          </ErrorBoundary>
        </MockServiceWorkerProvider>
        <Suspense fallback={null}>
          <DevVitalsOverlay />
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
