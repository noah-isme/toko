import { beforeEach, describe, expect, it } from 'vitest';

import {
  selectIsSaved,
  useSavedForLaterStore,
  type SavedItem,
} from '@/stores/saved-for-later-store';

function item(overrides: Partial<SavedItem> = {}): SavedItem {
  return {
    productId: 'p1',
    name: 'Kaos Hitam Polos',
    quantity: 2,
    price: { amount: 100000, currency: 'IDR' },
    image: null,
    ...overrides,
  };
}

describe('saved for later store', () => {
  beforeEach(() => {
    useSavedForLaterStore.setState({ items: [] });
  });

  it('saves an item', () => {
    useSavedForLaterStore.getState().save(item());

    expect(useSavedForLaterStore.getState().items).toHaveLength(1);
    expect(useSavedForLaterStore.getState().items[0]).toMatchObject({
      productId: 'p1',
      quantity: 2,
    });
  });

  it('puts the most recently saved item first', () => {
    useSavedForLaterStore.getState().save(item({ productId: 'p1' }));
    useSavedForLaterStore.getState().save(item({ productId: 'p2' }));

    expect(useSavedForLaterStore.getState().items.map((i) => i.productId)).toEqual(['p2', 'p1']);
  });

  it('replaces rather than duplicates an already-saved product', () => {
    useSavedForLaterStore.getState().save(item({ productId: 'p1', quantity: 1 }));
    useSavedForLaterStore.getState().save(item({ productId: 'p1', quantity: 5 }));

    const { items } = useSavedForLaterStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(5);
  });

  it('removes a saved item by product id', () => {
    useSavedForLaterStore.getState().save(item({ productId: 'p1' }));
    useSavedForLaterStore.getState().save(item({ productId: 'p2' }));
    useSavedForLaterStore.getState().remove('p1');

    expect(useSavedForLaterStore.getState().items.map((i) => i.productId)).toEqual(['p2']);
  });

  it('clears everything', () => {
    useSavedForLaterStore.getState().save(item({ productId: 'p1' }));
    useSavedForLaterStore.getState().save(item({ productId: 'p2' }));
    useSavedForLaterStore.getState().clear();

    expect(useSavedForLaterStore.getState().items).toEqual([]);
  });

  it('reports whether a product is parked', () => {
    useSavedForLaterStore.getState().save(item({ productId: 'p1' }));

    expect(selectIsSaved('p1')(useSavedForLaterStore.getState())).toBe(true);
    expect(selectIsSaved('p2')(useSavedForLaterStore.getState())).toBe(false);
  });
});
