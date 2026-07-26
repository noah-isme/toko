import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_RECENT_SEARCHES, useSearchStore } from '@/stores/search-store';

function reset() {
  useSearchStore.setState({ term: '', recentSearches: [] });
}

describe('search store recent searches', () => {
  beforeEach(reset);

  it('records submitted terms most recent first', () => {
    useSearchStore.getState().addRecentSearch('laptop');
    useSearchStore.getState().addRecentSearch('kamera');

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera', 'laptop']);
  });

  it('moves a repeated term back to the front instead of duplicating it', () => {
    useSearchStore.getState().addRecentSearch('laptop');
    useSearchStore.getState().addRecentSearch('kamera');
    useSearchStore.getState().addRecentSearch('laptop');

    expect(useSearchStore.getState().recentSearches).toEqual(['laptop', 'kamera']);
  });

  it('treats terms differing only in case as the same search', () => {
    useSearchStore.getState().addRecentSearch('Laptop');
    useSearchStore.getState().addRecentSearch('laptop');

    // Keeps the casing the user typed most recently.
    expect(useSearchStore.getState().recentSearches).toEqual(['laptop']);
  });

  it('trims whitespace and ignores blank terms', () => {
    useSearchStore.getState().addRecentSearch('  kamera  ');
    useSearchStore.getState().addRecentSearch('   ');
    useSearchStore.getState().addRecentSearch('');

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera']);
  });

  it(`caps history at ${MAX_RECENT_SEARCHES} entries, dropping the oldest`, () => {
    for (let i = 1; i <= MAX_RECENT_SEARCHES + 3; i += 1) {
      useSearchStore.getState().addRecentSearch(`term-${i}`);
    }

    const { recentSearches } = useSearchStore.getState();
    expect(recentSearches).toHaveLength(MAX_RECENT_SEARCHES);
    expect(recentSearches[0]).toBe(`term-${MAX_RECENT_SEARCHES + 3}`);
    expect(recentSearches).not.toContain('term-1');
  });

  it('removes a single term', () => {
    useSearchStore.getState().addRecentSearch('laptop');
    useSearchStore.getState().addRecentSearch('kamera');
    useSearchStore.getState().removeRecentSearch('laptop');

    expect(useSearchStore.getState().recentSearches).toEqual(['kamera']);
  });

  it('clears the whole history', () => {
    useSearchStore.getState().addRecentSearch('laptop');
    useSearchStore.getState().addRecentSearch('kamera');
    useSearchStore.getState().clearRecentSearches();

    expect(useSearchStore.getState().recentSearches).toEqual([]);
  });

  it('keeps the in-progress term out of persisted history', () => {
    useSearchStore.getState().setTerm('sedang diketik');

    expect(useSearchStore.getState().term).toBe('sedang diketik');
    expect(useSearchStore.getState().recentSearches).toEqual([]);
  });
});
