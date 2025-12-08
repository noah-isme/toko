'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { Container } from '@/components/layout/container';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { OfflineBanner } from '@/components/offline-banner';
import { useCartStore } from '@/stores/cart-store';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  const initGuestCart = useCartStore((state) => state.initGuestCart);
  const cartId = useCartStore((state) => state.cartId);

  useEffect(() => {
    if (!cartId) {
      initGuestCart();
    }
  }, [cartId, initGuestCart]);

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 py-8">
        <Container>{children}</Container>
      </main>
      <Footer />
    </div>
  );
}
