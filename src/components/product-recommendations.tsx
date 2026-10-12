'use client';

import { Sparkles, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFrequentlyBoughtTogether,
  useCustomersAlsoViewed,
  usePersonalizedRecommendations,
  useTrendingProducts,
} from '@/entities/catalog/hooks';

interface RecommendationSectionProps {
  /** Stable heading id (kept locale-independent so anchors and aria links do not change). */
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  emptyMessage?: string;
}

function RecommendationSection({
  id,
  title,
  icon,
  children,
  emptyMessage,
}: RecommendationSectionProps) {
  const t = useTranslations('product.recommendations');
  return (
    <section className="space-y-4" aria-labelledby={id}>
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{children}</div>
      <p className="hidden text-sm text-muted-foreground" aria-live="polite">
        {emptyMessage ?? t('emptyDefault')}
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
  const t = useTranslations('product.recommendations.frequentlyBoughtTogether');
  const { data, isLoading, error } = useFrequentlyBoughtTogether(productId);

  if (isLoading) {
    return (
      <RecommendationSection
        id="frequently-bought-together"
        title={t('title')}
        icon={<Users className="h-5 w-5" />}
      >
        <RecommendationSkeleton />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection
      id="frequently-bought-together"
      title={t('title')}
      icon={<Users className="h-5 w-5" />}
      emptyMessage={t('empty')}
    >
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function CustomersAlsoViewed({ productId }: { productId: string }) {
  const t = useTranslations('product.recommendations.customersAlsoViewed');
  const { data, isLoading, error } = useCustomersAlsoViewed(productId);

  if (isLoading) {
    return (
      <RecommendationSection
        id="customers-also-viewed"
        title={t('title')}
        icon={<Sparkles className="h-5 w-5" />}
      >
        <RecommendationSkeleton />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection
      id="customers-also-viewed"
      title={t('title')}
      icon={<Sparkles className="h-5 w-5" />}
      emptyMessage={t('empty')}
    >
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function PersonalizedRecommendations() {
  const t = useTranslations('product.recommendations.personalized');
  const { data, isLoading, error } = usePersonalizedRecommendations(8, { enabled: true });

  if (isLoading) {
    return (
      <RecommendationSection
        id="recommended-for-you"
        title={t('title')}
        icon={<RefreshCw className="h-5 w-5" />}
      >
        <RecommendationSkeleton count={8} />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection
      id="recommended-for-you"
      title={t('title')}
      icon={<RefreshCw className="h-5 w-5" />}
      emptyMessage={t('empty')}
    >
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </RecommendationSection>
  );
}

function TrendingProducts() {
  const t = useTranslations('product.recommendations.trending');
  const { data, isLoading, error } = useTrendingProducts(8);

  if (isLoading) {
    return (
      <RecommendationSection
        id="trending-now"
        title={t('title')}
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <RecommendationSkeleton count={8} />
      </RecommendationSection>
    );
  }

  if (error || !data || data.length === 0) {
    return null;
  }

  return (
    <RecommendationSection
      id="trending-now"
      title={t('title')}
      icon={<TrendingUp className="h-5 w-5" />}
      emptyMessage={t('empty')}
    >
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
