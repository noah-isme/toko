'use client';

import Link from 'next/link';

import { useCategories } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

export function CategoriesSection() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return <CategoriesSkeleton />;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Shop by Category</h2>
        <p className="text-sm text-muted-foreground">
          Explore our curated collection of products by category
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className={cn(
              'group relative overflow-hidden rounded-lg border bg-card p-6 text-center transition-all',
              'hover:border-primary hover:shadow-lg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className="space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl transition-colors group-hover:bg-primary/20">
                {getCategoryIcon(category.slug)}
              </div>
              <h3 className="font-semibold text-foreground">{category.name}</h3>
              {category.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{category.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <BaseSkeleton className="h-8 w-48" />
        <BaseSkeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-6">
            <BaseSkeleton className="mx-auto h-12 w-12 rounded-full" />
            <BaseSkeleton className="mx-auto h-5 w-20" />
            <BaseSkeleton className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}

function getCategoryIcon(slug: string): string {
  const icons: Record<string, string> = {
    electronics: '💻',
    clothing: '👕',
    books: '📚',
    home: '🏠',
    sports: '⚽',
    toys: '🧸',
    beauty: '💄',
    food: '🍔',
    jewelry: '💍',
    automotive: '🚗',
    music: '🎵',
    games: '🎮',
    office: '📎',
    pets: '🐾',
    garden: '🌱',
    health: '💊',
  };

  return icons[slug.toLowerCase()] || '📦';
}
