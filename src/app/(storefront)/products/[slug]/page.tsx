import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { cache, Suspense } from 'react';

import { CustomersAlsoViewed } from '@/components/customers-also-viewed';
import { FrequentlyBoughtTogether } from '@/components/frequently-bought-together';
import { ProductDetail } from '@/components/product-detail';
import { RelatedProductList } from '@/components/related-product-list';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { catalogKeys } from '@/entities/catalog/keys';
import { ProductQASection } from '@/entities/qa/ui/ProductQASection';
import { ReviewForm } from '@/entities/reviews/ui/ReviewForm';
import { ReviewList } from '@/entities/reviews/ui/ReviewList';
import { ReviewStats } from '@/entities/reviews/ui/ReviewStats';
import { ApiClientError } from '@/lib/api/apiClient';
import { serverCatalogApi } from '@/lib/api/server-catalog';
import type { ProductDetail as ProductDetailData } from '@/lib/api/types';
import { getQueryClient } from '@/lib/query/get-query-client';
import { JsonLd } from '@/shared/seo/JsonLd';
import { productJsonLd } from '@/shared/seo/jsonld';
import { abs, localeAlternates, localizedCanonical, ogImageUrl } from '@/shared/seo/seo';

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

type FetchedProduct =
  | { status: 'ok'; product: ProductDetailData }
  | { status: 'missing' }
  | { status: 'unavailable' };

// Cached per request so generateMetadata and the page share one fetch (and one
// 404 decision). Goes through the same catalogApi functions as the client
// `useProduct` hook, so the hydrated query data has the hook's exact shape.
// Works in mock mode too (in-process mock, see src/lib/api/server.ts).
const fetchProduct = cache(async (slug: string): Promise<FetchedProduct> => {
  try {
    return { status: 'ok', product: await serverCatalogApi.getProduct(slug) };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { status: 'missing' };
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch product metadata', error);
    }
    return { status: 'unavailable' };
  }
});

async function loadProduct(slug: string) {
  const result = await fetchProduct(slug);
  if (result.status === 'missing') {
    notFound();
  }
  return result.status === 'ok' ? result.product : null;
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
  const product = await loadProduct(slug);
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'seo.product' });
  const path = `/products/${product?.slug ?? slug}`;
  const canonical = localizedCanonical(locale, path);
  const alternates = { canonical, languages: localeAlternates(path) };

  if (!product) {
    const fallbackTitle = humanizeSlug(slug) || t('fallbackTitle');
    const description = t('fallbackDescription');
    const ogImage = ogImageUrl(locale, fallbackTitle);

    return {
      title: fallbackTitle,
      description,
      alternates,
      openGraph: {
        title: fallbackTitle,
        description,
        url: canonical,
        type: 'website',
        images: [{ url: ogImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description,
        images: [ogImage],
      },
    };
  }

  const title = product.title;
  const description = product.description;
  const ogImages = product.images?.length
    ? product.images.map((image, index) => ({
        url: abs(image),
        alt: t('imageAlt', { title: product.title, index: index + 1 }),
      }))
    : [{ url: ogImageUrl(locale, product.title) }];

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: canonical,
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
  const product = await loadProduct(slug);
  const t = await getTranslations('product');

  // Hydrate the ProductDetail/RelatedProductList islands: the product comes
  // from the cached fetch above, related products are prefetched here. Failed
  // queries are not dehydrated, so those islands fall back to client fetching.
  const queryClient = getQueryClient();
  if (product) {
    queryClient.setQueryData(catalogKeys.product(slug), product);
  }
  await queryClient.prefetchQuery({
    queryKey: catalogKeys.relatedProducts(slug),
    queryFn: () => serverCatalogApi.getRelatedProducts(slug),
  });

  const structuredData = productJsonLd(product ?? null);
  const resolvedProductId = product?.id ?? slug;
  const productLabel = product?.title ?? humanizeSlug(slug) ?? t('breadcrumb.fallback');

  return (
    <>
      <JsonLd id="product-jsonld" data={structuredData} />
      <div className="space-y-12">
        <Breadcrumbs
          items={[
            { label: t('breadcrumb.home'), href: '/' },
            { label: t('breadcrumb.products'), href: '/products' },
            { label: productLabel },
          ]}
        />
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProductDetail slug={slug} />
          <RelatedProductList slug={slug} />
        </HydrationBoundary>
        <Suspense
          fallback={
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {t('recommendations.frequentlyBoughtTogether.title')}
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <div className="aspect-square w-full rounded-xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-[80%] rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <FrequentlyBoughtTogether productId={slug} />
        </Suspense>
        <Suspense
          fallback={
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {t('recommendations.customersAlsoViewed.title')}
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <div className="aspect-square w-full rounded-xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-[80%] rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <CustomersAlsoViewed productId={slug} />
        </Suspense>
        <section id="reviews" className="space-y-6">
          <Suspense fallback={<ReviewSkeleton />}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
              <ReviewStats productId={resolvedProductId} />
              <ReviewForm productId={resolvedProductId} />
            </div>
            <ReviewList productId={resolvedProductId} pageSize={5} />
          </Suspense>
        </section>
        <section id="qa" className="space-y-6 border-t border-border/60 pt-12">
          <Suspense fallback={<ReviewSkeleton />}>
            <ProductQASection productId={resolvedProductId} />
          </Suspense>
        </section>
      </div>
    </>
  );
}
