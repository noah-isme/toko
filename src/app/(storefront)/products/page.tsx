import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { catalogKeys } from '@/entities/catalog/keys';
import {
  productApiParamsFromSearchParams,
  toUrlSearchParams,
} from '@/entities/search/lib/apiParams';
import { AdvancedSearchResults } from '@/entities/search/ui/AdvancedSearchResults';
import { localizedPath } from '@/i18n/config';
import { serverCatalogApi } from '@/lib/api/server-catalog';
import { getQueryClient } from '@/lib/query/get-query-client';
import { JsonLd } from '@/shared/seo/JsonLd';
import { breadcrumbJsonLd } from '@/shared/seo/jsonld';
import { localeAlternates, localizedCanonical, ogImageUrl } from '@/shared/seo/seo';
import { ProductCardSkeleton } from '@/shared/ui/skeletons/ProductCardSkeleton';

const PATH = '/products';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'seo.products' });
  const title = t('title');
  const description = t('description');
  const canonical = localizedCanonical(locale, PATH);
  const ogImage = ogImageUrl(locale, title);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: localeAlternates(PATH),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Prefetch the exact request the AdvancedSearchResults island makes on first
  // render, so the product grid is in the HTML and the island does not refetch.
  // prefetchQuery never throws; a failed fetch is simply not dehydrated and the
  // island falls back to fetching on the client.
  const apiParams = productApiParamsFromSearchParams(toUrlSearchParams(await searchParams));
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: catalogKeys.products(apiParams),
    queryFn: () => serverCatalogApi.getProducts(apiParams),
  });
  if (process.env.NODE_ENV !== 'production') {
    const error = queryClient.getQueryState(catalogKeys.products(apiParams))?.error;
    if (error) console.warn('[products] server prefetch failed', error);
  }

  const t = await getTranslations('catalog.page');
  const locale = await getLocale();
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const breadcrumb = breadcrumbJsonLd([
    { name: tSeo('breadcrumb.home'), item: localizedPath(locale, '/') },
    { name: tSeo('products.title'), item: localizedPath(locale, PATH) },
  ]);

  return (
    <>
      <JsonLd id="breadcrumb-jsonld" data={breadcrumb} />
      <div className="space-y-8">
        <header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card px-6 py-10 shadow-[0_16px_45px_-36px_rgba(43,32,22,0.5)] sm:px-10">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="font-display mt-3 text-5xl leading-none text-foreground sm:text-6xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t('description')}
          </p>
        </header>
        <Suspense
          fallback={
            <div className="space-y-4">
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          }
        >
          <HydrationBoundary state={dehydrate(queryClient)}>
            <AdvancedSearchResults />
          </HydrationBoundary>
        </Suspense>
      </div>
    </>
  );
}
