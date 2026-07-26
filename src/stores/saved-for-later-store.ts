import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * A cart line the shopper parked for later. This is a client-side snapshot:
 * the item no longer exists server-side once it leaves the cart, so we keep
 * enough detail to render it and to put it back.
 */
export interface SavedItem {
  productId: string;
  name: string;
  quantity: number;
  price: { amount: number; currency: string };
  image?: string | null;
  maxQuantity?: number;
}

interface SavedForLaterState {
  items: SavedItem[];
  /** Adds an item, replacing any existing entry for the same product. */
  save: (item: SavedItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useSavedForLaterStore = create<SavedForLaterState>()(
  persist(
    (set) => ({
      items: [],

      save: (item) =>
        set((state) => ({
          items: [item, ...state.items.filter((entry) => entry.productId !== item.productId)],
        })),

      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((entry) => entry.productId !== productId),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'saved-for-later-storage',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** True when the product is currently parked in the saved list. */
export function selectIsSaved(productId: string) {
  return (state: SavedForLaterState) => state.items.some((entry) => entry.productId === productId);
}
