import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Upper bound on stored history, so the dropdown stays scannable. */
export const MAX_RECENT_SEARCHES = 8;

interface SearchState {
  /** The term currently being typed. Not persisted. */
  term: string;
  /** Previously submitted terms, most recent first. */
  recentSearches: string[];
  setTerm: (term: string) => void;
  /** Records a submitted term, de-duplicated and moved to the front. */
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      term: '',
      recentSearches: [],

      setTerm: (term) => set({ term }),

      addRecentSearch: (term) =>
        set((state) => {
          const trimmed = term.trim();
          if (!trimmed) {
            return state;
          }
          // Case-insensitive de-dupe, but keep the casing the user just typed.
          const withoutDuplicate = state.recentSearches.filter(
            (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
          );
          return {
            recentSearches: [trimmed, ...withoutDuplicate].slice(0, MAX_RECENT_SEARCHES),
          };
        }),

      removeRecentSearch: (term) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((entry) => entry !== term),
        })),

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'search-storage',
      // `term` is per-session UI state; only the history is worth persisting.
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
