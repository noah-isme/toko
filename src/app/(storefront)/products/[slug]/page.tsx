import type { Metadata } from 'next';
import { Suspense, lazy } from 'react';

import { ProductDetail } from '@/components/product-detail';
import { RelatedProductList } from '@/components/related-product-list';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { mapApiProductToProduct } from '@/lib/api/mappers/product';
import { productSchema } from '@/lib/api/schemas';
import type { ApiProduct, ApiResponse } from '@/lib/api/types';
import { JsonLd } from '@/shared/seo/JsonLd';
import { productJsonLd } from '@/shared/seo/jsonld';
import { abs, getCanonical } from '@/shared/seo/seo';

const ReviewStats = lazy(() =>
  import('@/entities/reviews/ui/ReviewStats').then((mod) => ({ default: mod.ReviewStats })),
);
const ReviewForm = lazy(() =>
  import('@/entities/reviews/ui/ReviewForm').then((mod) => ({ default: mod.ReviewForm })),
);
const ReviewList = lazy(() =>
  import('@/entities/reviews/ui/ReviewList').then((mod) => ({ default: mod.ReviewList })),
);

function ReviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div className="animate-pulse space-y-4 rounded-lg border border-border/60 p-4">
          <div className="h-5 w-1/2 bg-muted" />
          <div className="h-10 w-24 bg-muted" />
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <div className="h-3 w-4 bg-muted" />
                <div className="h-2 flex-1 bg-muted" />
                <div className="h-3 w-8 bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <div className="animate-pulse space-y-4 rounded-lg border border-border/60 p-4">
          <div className="h-5 w-1/3 bg-muted" />
          <div className="h-4 w-full bg-muted" />
          <div className="h-4 w-11/12 bg-muted" />
          <div className="h-8 w-32 bg-muted" />
        </div>
      </div>
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/50 p-4">
            <div className="h-4 w-1/5 bg-muted" />
            <div className="h-4 w-full bg-muted" />
            <div className="h-4 w-11/12 bg-muted" />
            <div className="h-8 w-32 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProduct(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl === 'mock') {
    return null;
  }

  try {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/products/${slug}`;
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as ApiResponse<ApiProduct>;
    return mapApiProductToProduct(json.data);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch product metadata', error);
    }

    return null;
  }
}

function humanizeSlug(slug: string) {
  return slug
    .split('-')
    .map((chunk) => (chunk ? chunk[0]?.toUpperCase().concat(chunk.slice(1)) : ''))
    .join(' ')
    .trim();
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) {
    const fallbackTitle = humanizeSlug(slug) || 'Product';
    const canonical = getCanonical(`/products/${slug}`);
    const ogImage = abs(`/api/og?title=${encodeURIComponent(fallbackTitle)}`);

    return {
      title: fallbackTitle,
      description: 'Discover the latest products available on toko.',
      alternates: {
        canonical,
        languages: {
          'en-US': canonical,
          'id-ID': canonical,
        },
      },
      openGraph: {
        title: fallbackTitle,
        description: 'Discover the latest products available on toko.',
        url: canonical,
        type: 'website',
        images: [{ url: ogImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description: 'Discover the latest products available on toko.',
        images: [ogImage],
      },
    };
  }

  const title = product.title;
  const description = product.description;
  const canonical = getCanonical(`/products/${product.slug}`);
  const productUrl = abs(`/products/${product.slug}`);
  const ogImages = product.images?.length
    ? product.images.map((image, index) => ({
        url: abs(image),
        alt: `${product.title} image ${index + 1}`,
      }))
    : [{ url: abs('/api/og?title=' + encodeURIComponent(product.title)) }];

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        'en-US': canonical,
        'id-ID': canonical,
      },
    },
    openGraph: {
      title,
      description,
      url: productUrl,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  const structuredData = productJsonLd(product ?? null);
  const resolvedProductId = product?.id ?? slug;
  const productLabel = product?.title ?? humanizeSlug(slug) ?? 'Produk';

  return (
    <>
      <JsonLd id="product-jsonld" data={structuredData} />
      <div className="space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Beranda', href: '/' },
            { label: 'Produk', href: '/products' },
            { label: productLabel },
          ]}
        />
        <ProductDetail slug={slug} />
        <RelatedProductList slug={slug} />
        <section id="reviews" className="space-y-6">
          <Suspense fallback={<ReviewSkeleton />}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
              <ReviewStats productId={resolvedProductId} />
              <ReviewForm productId={resolvedProductId} />
            </div>
            <ReviewList productId={resolvedProductId} pageSize={5} />
          </Suspense>
        </section>
      </div>
    </>
  );
}
