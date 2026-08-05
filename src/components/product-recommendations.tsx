'use client';

import { Sparkles, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFrequentlyBoughtTogether,
  useCustomersAlsoViewed,
  usePersonalizedRecommendations,
  useTrendingProducts,
} from '@/lib/api/hooks.react-query';

interface RecommendationSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  emptyMessage?: string;
}

function RecommendationSection({ title, icon, children, emptyMessage = 'No recommendations available' }: RecommendationSectionProps) {
  return (
    <section className="space-y-4" aria-labelledby={title.toLowerCase().replace(/\s+/g, '-')}>
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 id={title.toLowerCase().replace(/\s+/g, '-')} className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
      <p className="hidden text-sm text-muted-foreground" aria-live="polite">
        {emptyMessage}
      </p>
    </section>
  );
}

function RecommendationSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { data, isLoading, error } = useFrequentlyBoughtTogether(productId);

  if (isLoading) {
    return (
      <RecommendationSection title="Frequently Bought Together" icon={<Users className="h-5 w-5" />}>
        <RecommendationSkeleton />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection title="Frequently Bought Together" icon={<Users className="h-5 w-5" />} emptyMessage="No frequently bought together items">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function CustomersAlsoViewed({ productId }: { productId: string }) {
  const { data, isLoading, error } = useCustomersAlsoViewed(productId);

  if (isLoading) {
    return (
      <RecommendationSection title="Customers Also Viewed" icon={<Sparkles className="h-5 w-5" />}>
        <RecommendationSkeleton />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection title="Customers Also Viewed" icon={<Sparkles className="h-5 w-5" />} emptyMessage="No recently viewed items">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function PersonalizedRecommendations() {
  const { data, isLoading, error } = usePersonalizedRecommendations(8, { enabled: true });

  if (isLoading) {
    return (
      <RecommendationSection title="Recommended for You" icon={<RefreshCw className="h-5 w-5" />}>
        <RecommendationSkeleton count={8} />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection title="Recommended for You" icon={<RefreshCw className="h-5 w-5" />} emptyMessage="No personalized recommendations yet">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function TrendingProducts() {
  const { data, isLoading, error } = useTrendingProducts(8);

  if (isLoading) {
    return (
      <RecommendationSection title="Trending Now" icon={<TrendingUp className="h-5 w-5" />}>
        <RecommendationSkeleton count={8} />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection title="Trending Now" icon={<TrendingUp className="h-5 w-5" />} emptyMessage="No trending products">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

export function ProductRecommendations({ productId }: { productId: string }) {
  return (
    <div className="space-y-10 border-t pt-8">
      <Suspense fallback={<RecommendationSkeleton count={4} />}>
        <FrequentlyBoughtTogether productId={productId} />
      </Suspense>
      <Suspense fallback={<RecommendationSkeleton count={4} />}>
        <CustomersAlsoViewed productId={productId} />
      </Suspense>
      <Suspense fallback={<RecommendationSkeleton count={8} />}>
        <PersonalizedRecommendations />
      </Suspense>
      <Suspense fallback={<RecommendationSkeleton count={8} />}>
        <TrendingProducts />
      </Suspense>
    </div>
  );
}

// Simplified version for homepage/other pages
export function HomeRecommendations() {
  return (
    <div className="space-y-10">
      <Suspense fallback={<RecommendationSkeleton count={8} />}>
        <PersonalizedRecommendations />
      </Suspense>
      <Suspense fallback={<RecommendationSkeleton count={8} />}>
        <TrendingProducts />
      </Suspense>
    </div>
  );
}