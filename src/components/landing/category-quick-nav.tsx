'use client';

import {
  Sparkles,
  ArrowRight,
  Laptop,
  Shirt,
  BookOpen,
  Home,
  Trophy,
  Gamepad2,
  Car,
  Music,
  Paperclip,
  Dog,
  Sprout,
  HeartPulse,
  Package,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { useCategories } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Laptop,
  clothing: Shirt,
  books: BookOpen,
  home: Home,
  sports: Trophy,
  toys: Gamepad2,
  beauty: Sparkles,
  food: ShoppingBag,
  jewelry: Sparkles,
  automotive: Car,
  music: Music,
  games: Gamepad2,
  office: Paperclip,
  pets: Dog,
  garden: Sprout,
  health: HeartPulse,
};

export function CategoryQuickNav() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return <CategoryQuickNavSkeleton />;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Kategori Pilihan
          </h2>
        </div>
        <Link
          href="/products"
          className="group inline-flex items-center text-xs font-semibold text-foreground transition-colors hover:text-primary"
        >
          Lihat Semua{' '}
          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.slug.toLowerCase()] || Package;
          return (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs',
                'transition-all duration-150 hover:border-primary/60 hover:bg-accent/50 active:scale-[0.98]',
              )}
            >
              <Icon className="h-4 w-4 text-primary/80" />
              <span>{category.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CategoryQuickNavSkeleton() {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <BaseSkeleton key={i} className="h-9 w-28 shrink-0 rounded-lg" />
      ))}
    </div>
  );
}
