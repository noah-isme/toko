'use client';

import { Suspense } from 'react';

import { LazyWrapper } from '@/components/lazy-components';
import { LazyLandingHero } from '@/components/lazy-components';
import { LazyCategoryQuickNav } from '@/components/lazy-components';
import { LazyFlashSaleSection } from '@/components/lazy-components';
import { LazyLandingFeatures } from '@/components/lazy-components';
import { LazyCategoriesSection } from '@/components/lazy-components';
import { LazyBrandsSection } from '@/components/lazy-components';
import { LazyProductsCatalog } from '@/components/lazy-components';
import { LazyLandingTestimonials } from '@/components/lazy-components';
import { LazyLandingCTA } from '@/components/lazy-components';

/**
 * Public landing page for guests/unauthenticated users with Bento Minimalist layout
 */
export function LandingPage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <LazyWrapper fallbackVariant="hero">
        <LazyLandingHero />
      </LazyWrapper>
      <LazyWrapper>
        <LazyCategoryQuickNav />
      </LazyWrapper>
      <LazyWrapper>
        <LazyFlashSaleSection />
      </LazyWrapper>
      <LazyWrapper>
        <LazyLandingFeatures />
      </LazyWrapper>
      <LazyWrapper>
        <LazyCategoriesSection />
      </LazyWrapper>
      <LazyWrapper>
        <LazyBrandsSection />
      </LazyWrapper>
      <LazyWrapper fallbackVariant="grid">
        <LazyProductsCatalog />
      </LazyWrapper>
      <LazyWrapper>
        <LazyLandingTestimonials />
      </LazyWrapper>
      <LazyWrapper>
        <LazyLandingCTA />
      </LazyWrapper>
    </div>
  );
}
