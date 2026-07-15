'use client';

import type { ReactNode } from 'react';

import { Container } from '@/components/layout/container';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Navbar } from '@/components/layout/navbar';
import { OfflineBanner } from '@/components/offline-banner';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 py-8 pb-24 md:pb-8">
        <Container>{children}</Container>
      </main>
      <MobileBottomNav />
      <Footer />
    </div>
  );
}
