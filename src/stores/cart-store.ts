/**
 * Cart Store with Zustand
 * Manages cart state for both guest and authenticated users
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { cartApi } from '../lib/api/services';
import type { Cart } from '../lib/api/types';

interface CartStore {
  // State
  cartId: string | null;
  anonId: string | null;
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCartId: (cartId: string) => void;
  setAnonId: (anonId: string) => void;
  setCart: (cart: Cart | null) => void;
  clearCart: () => void;

  // Async operations
  initGuestCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  mergeGuestCart: () => Promise<string | null>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial state
      cartId: null,
      anonId: null,
      cart: null,
      isLoading: false,
      error: null,

      // Sync actions
      setCartId: (cartId) => set({ cartId }),

      setAnonId: (anonId) => set({ anonId }),

      setCart: (cart) => set({ cart }),

      clearCart: () =>
        set({
          cartId: null,
          anonId: null,
          cart: null,
          error: null,
        }),

      // Initialize guest cart
      initGuestCart: async () => {
        const { cartId, anonId } = get();

        if (cartId && anonId) {
          return; // Already initialized
        }

        try {
          set({ isLoading: true, error: null });
          const response = await cartApi.createCart();
          set({
            cartId: response.cartId,
            anonId: response.anonId,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create cart',
            isLoading: false,
          });
        }
      },

      // Fetch cart from API
      fetchCart: async () => {
        const { cartId } = get();

        if (!cartId) {
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const cart = await cartApi.getCart(cartId);
          set({ cart, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch cart',
            isLoading: false,
            cart: null,
          });
        }
      },

      // Merge guest cart to user cart after login
      mergeGuestCart: async () => {
        const { cartId, anonId } = get();

        if (!cartId || !anonId) {
          return null; // No guest cart to merge
        }

        try {
          set({ isLoading: true, error: null });
          const response = await cartApi.mergeCart({ cartId });

          set({
            cartId: response.cartId,
            anonId: null, // Clear anonId after merge
            isLoading: false,
          });

          // Fetch the merged cart
          await get().fetchCart();

          return response.cartId;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to merge cart',
            isLoading: false,
          });
          return null;
        }
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        cartId: state.cartId,
        anonId: state.anonId,
      }),
    },
  ),
);
