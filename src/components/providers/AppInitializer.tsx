'use client';

import { useEffect, useRef } from 'react';

import { useCartStore } from '@/stores/cart-store';

export function AppInitializer() {
  const hasInitializedGuestCart = useRef(false);
  const anonId = useCartStore((state) => state.anonId);
  const initGuestCart = useCartStore((state) => state.initGuestCart);

  useEffect(() => {
    if (hasInitializedGuestCart.current) {
      return;
    }

    hasInitializedGuestCart.current = true;
    if (anonId) {
      return;
    }

    void initGuestCart();
  }, [anonId, initGuestCart]);

  return null;
}
