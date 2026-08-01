import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProductsCatalog } from '@/components/products-catalog';
import { JsonLd } from '@/shared/seo/JsonLd';
import { breadcrumbJsonLd } from '@/shared/seo/jsonld';
import { abs, getCanonical } from '@/shared/seo/seo';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

const pageTitle = 'Products';
const pageDescription = 'Explore curated products from toko for your next purchase.';
const canonical = getCanonical('/products');
const ogImage = abs(`/api/og?title=${encodeURIComponent(pageTitle)}`);

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical,
    languages: {
      'en-US': canonical,
      'id-ID': canonical,
    },
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: canonical,
    type: 'website',
    images: [{ url: ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
    images: [ogImage],
  },
};

export default function ProductsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', item: '/' },
    { name: pageTitle, item: '/products' },
  ]);

  return (
    <>
      <JsonLd id="breadcrumb-jsonld" data={breadcrumb} />
      <div className="space-y-8">
        <header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-6 py-10 shadow-[0_16px_45px_-36px_rgba(43,32,22,0.5)] sm:px-10">
          <p className="eyebrow">The collection</p>
          <h1 className="font-display mt-3 text-5xl leading-none text-foreground sm:text-6xl">
            Temukan pilihan Anda.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Jelajahi produk pilihan untuk ruang, rutinitas, dan momen keseharian Anda.
          </p>
        </header>
        <Suspense fallback={<ProductCardSkeleton />}>
          <ProductsCatalog showHeader={false} />
        </Suspense>
      </div>
    </>
  );
}
