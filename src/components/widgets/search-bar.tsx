"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { useProductFiltersStore } from "@/stores/product-filters-store";

const DEBOUNCE_MS = 400;

export const SearchBar = () => {
  const search = useProductFiltersStore((state) => state.search);
  const setSearch = useProductFiltersStore((state) => state.setSearch);
  const [value, setValue] = useState(search);

  useEffect(() => {
    setValue(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (value !== search) {
        setSearch(value.trim());
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, search, setSearch]);

  const icon = useMemo(() => <Search className="h-4 w-4 text-muted-foreground" aria-hidden />, []);

  return (
    <div className="relative w-full max-w-md">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search products"
        className="pl-9"
        aria-label="Search products"
      />
    </div>
  );
};
