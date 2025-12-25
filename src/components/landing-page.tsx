'use client';

import { BrandsSection } from '@/components/brands-section';
import { CategoriesSection } from '@/components/categories-section';
import { LandingCTA } from '@/components/landing/landing-cta';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingTestimonials } from '@/components/landing/landing-testimonials';
import { ProductsCatalog } from '@/components/products-catalog';

/**
 * Public landing page for guests/unauthenticated users
 */
export function LandingPage() {
  return (
    <div className="space-y-16">
      <LandingHero />
      <LandingFeatures />
      <CategoriesSection />
      <BrandsSection />
      <ProductsCatalog />
      <LandingTestimonials />
      <LandingCTA />
    </div>
  );
}
