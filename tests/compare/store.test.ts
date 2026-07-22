import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_COMPARE_ITEMS,
  selectIsCompareFull,
  selectIsComparing,
  useCompareStore,
} from '@/stores/compare-store';

function reset() {
  useCompareStore.setState({ productIds: [] });
}

describe('compare store', () => {
  beforeEach(reset);

  it('adds products in insertion order', () => {
    useCompareStore.getState().add('a');
    useCompareStore.getState().add('b');
    expect(useCompareStore.getState().productIds).toEqual(['a', 'b']);
  });

  it('ignores duplicate adds', () => {
    useCompareStore.getState().add('a');
    useCompareStore.getState().add('a');
    expect(useCompareStore.getState().productIds).toEqual(['a']);
  });

  it(`caps the selection at ${MAX_COMPARE_ITEMS} items`, () => {
    ['a', 'b', 'c', 'd'].forEach((id) => useCompareStore.getState().add(id));
    expect(useCompareStore.getState().productIds).toHaveLength(MAX_COMPARE_ITEMS);
    expect(useCompareStore.getState().productIds).toEqual(['a', 'b', 'c']);
  });

  it('toggle adds when absent and removes when present', () => {
    useCompareStore.getState().toggle('a');
    expect(useCompareStore.getState().productIds).toEqual(['a']);
    useCompareStore.getState().toggle('a');
    expect(useCompareStore.getState().productIds).toEqual([]);
  });

  it('remove takes a specific id out', () => {
    ['a', 'b'].forEach((id) => useCompareStore.getState().add(id));
    useCompareStore.getState().remove('a');
    expect(useCompareStore.getState().productIds).toEqual(['b']);
  });

  it('clear empties the selection', () => {
    ['a', 'b'].forEach((id) => useCompareStore.getState().add(id));
    useCompareStore.getState().clear();
    expect(useCompareStore.getState().productIds).toEqual([]);
  });

  it('selectIsComparing reflects membership', () => {
    useCompareStore.getState().add('a');
    const state = useCompareStore.getState();
    expect(selectIsComparing('a')(state)).toBe(true);
    expect(selectIsComparing('z')(state)).toBe(false);
  });

  it('selectIsCompareFull is true only at cap for products not already selected', () => {
    ['a', 'b', 'c'].forEach((id) => useCompareStore.getState().add(id));
    const state = useCompareStore.getState();
    // A new product cannot be added — full.
    expect(selectIsCompareFull('d')(state)).toBe(true);
    // An already-selected product is not "full" (it can still be toggled off).
    expect(selectIsCompareFull('a')(state)).toBe(false);
  });
});
