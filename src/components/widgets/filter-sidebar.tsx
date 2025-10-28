"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useProductFiltersStore } from "@/stores/product-filters-store";

const AVAILABLE_CATEGORIES = [
  "New arrivals",
  "Essentials",
  "Lifestyle",
  "Accessories",
  "Electronics",
];

export const FilterSidebar = () => {
  const { categories, toggleCategory, clear } = useProductFiltersStore((state) => ({
    categories: state.categories,
    toggleCategory: state.toggleCategory,
    clear: state.clear,
  }));

  const hasActiveFilters = useMemo(() => categories.length > 0, [categories]);

  return (
    <aside className="space-y-6 rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!hasActiveFilters}>
          Clear all
        </Button>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
        <ul className="space-y-2 text-sm">
          {AVAILABLE_CATEGORIES.map((category) => {
            const id = category.toLowerCase().replace(/\s+/g, "-");
            const checked = categories.includes(category);
            return (
              <li key={category} className="flex items-center gap-2">
                <input
                  id={`category-${id}`}
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={checked}
                  onChange={() => toggleCategory(category)}
                />
                <label htmlFor={`category-${id}`} className="cursor-pointer select-none">
                  {category}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Filters are currently local only and will be synced with the backend API during integration.
      </p>
    </aside>
  );
};
