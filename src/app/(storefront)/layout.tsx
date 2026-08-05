'use client';

import type { ReactNode } from 'react';

import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { IdleTimeoutWarning } from '@/components/IdleTimeoutWarning';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { Container } from '@/components/layout/container';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Navbar } from '@/components/layout/navbar';
import { LazyWrapper, LazyPushNotificationBanner } from '@/components/lazy-components';
import { OfflineBanner } from '@/components/offline-banner';
import { CompareBar } from '@/components/product-compare-bar';
import { BackToTop } from '@/components/ui/back-to-top';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 py-8 pb-24 md:pb-8">
        <Container>
          <LazyWrapper>
            <LazyPushNotificationBanner />
          </LazyWrapper>
          {children}
        </Container>
      </main>
      <MobileBottomNav />
      <CompareBar />
      <BackToTop />
      <Footer />
      <KeyboardShortcuts />
      <IdleTimeoutWarning />
      <CookieConsentBanner />
    </div>
  );
}
