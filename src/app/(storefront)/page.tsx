import type { Metadata } from 'next';

import { ProductsCatalog } from '@/components/products-catalog';
import { JsonLd } from '@/shared/seo/JsonLd';
import { orgJsonLd, websiteJsonLd } from '@/shared/seo/jsonld';
import { abs, getCanonical } from '@/shared/seo/seo';

const pageTitle = 'Home';
const pageDescription = 'Welcome to toko — discover modern commerce components for your store.';
const canonical = getCanonical('/');
const ogImage = abs('/api/og');

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

export default function HomePage() {
  return (
    <>
      <JsonLd id="organization-jsonld" data={orgJsonLd()} />
      <JsonLd id="website-jsonld" data={websiteJsonLd()} />
      <ProductsCatalog />
    </>
  );
}
