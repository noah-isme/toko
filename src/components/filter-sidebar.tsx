'use client';

import { Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface FilterSidebarProps {
  categories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
}

export function FilterSidebar({
  categories,
  selectedCategories,
  onToggleCategory,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const uniqueCategories = useMemo(() => Array.from(new Set(categories)).sort(), [categories]);

  const filterContent = (
    <div className="space-y-2">
      {uniqueCategories.map((category) => {
        const checked = selectedCategories.includes(category);
        return (
          <label
            key={category}
            className="flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm"
          >
            <span className="capitalize">{category}</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={checked}
              onChange={() => onToggleCategory(category)}
            />
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="text-base font-semibold">Filters</h3>
          {filterContent}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="lg:hidden" variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          {filterContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
