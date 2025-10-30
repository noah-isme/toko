import type { Metadata } from 'next';

import { ProductsCatalog } from '@/components/products-catalog';
import { JsonLd } from '@/shared/seo/JsonLd';
import { breadcrumbJsonLd } from '@/shared/seo/jsonld';
import { abs, getCanonical } from '@/shared/seo/seo';

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
      <ProductsCatalog />
    </>
  );
}
