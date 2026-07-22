import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_COMPARE_ITEMS = 3;

interface CompareState {
  /** Selected product ids, in insertion order, capped at MAX_COMPARE_ITEMS. */
  productIds: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],

      add: (productId) =>
        set((state) => {
          if (
            state.productIds.includes(productId) ||
            state.productIds.length >= MAX_COMPARE_ITEMS
          ) {
            return state;
          }
          return { productIds: [...state.productIds, productId] };
        }),

      remove: (productId) =>
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        })),

      toggle: (productId) => {
        const { productIds, add, remove } = get();
        if (productIds.includes(productId)) {
          remove(productId);
        } else {
          add(productId);
        }
      },

      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'compare-storage',
      partialize: (state) => ({ productIds: state.productIds }),
    },
  ),
);

/** True when the product is currently selected for comparison. */
export function selectIsComparing(productId: string) {
  return (state: CompareState) => state.productIds.includes(productId);
}

/** True when the comparison slots are full (and this product is not already in). */
export function selectIsCompareFull(productId: string) {
  return (state: CompareState) =>
    state.productIds.length >= MAX_COMPARE_ITEMS && !state.productIds.includes(productId);
}
