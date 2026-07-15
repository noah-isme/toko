'use client';

import { useEffect, useRef } from 'react';

import { useCartStore } from '@/stores/cart-store';

export function AppInitializer() {
  const hasStarted = useRef(false);
  const anonId = useCartStore((state) => state.anonId);
  const initGuestCart = useCartStore((state) => state.initGuestCart);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    if (anonId) {
      return;
    }

    void initGuestCart();
  }, [anonId, initGuestCart]);

  return null;
}
