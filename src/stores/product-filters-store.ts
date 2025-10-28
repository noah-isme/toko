import { create } from "zustand";

type FiltersState = {
  search: string;
  setSearch: (value: string) => void;
  categories: string[];
  toggleCategory: (category: string) => void;
  clear: () => void;
};

export const useProductFiltersStore = create<FiltersState>((set) => ({
  search: "",
  categories: [],
  setSearch: (value) => set({ search: value }),
  toggleCategory: (category) =>
    set((state) => {
      const exists = state.categories.includes(category);
      return {
        categories: exists
          ? state.categories.filter((item) => item !== category)
          : [...state.categories, category],
      };
    }),
  clear: () => set({ search: "", categories: [] }),
}));
