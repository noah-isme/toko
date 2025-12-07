import type { Metadata } from 'next';

import { ProductDetail } from '@/components/product-detail';
import { ReviewForm } from '@/entities/reviews/ui/ReviewForm';
import { ReviewList } from '@/entities/reviews/ui/ReviewList';
import { ReviewStats } from '@/entities/reviews/ui/ReviewStats';
import { productSchema } from '@/lib/api/schemas';
import { JsonLd } from '@/shared/seo/JsonLd';
import { productJsonLd } from '@/shared/seo/jsonld';
import { abs, getCanonical } from '@/shared/seo/seo';

interface ProductPageProps {
  params: { slug: string };
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

    const data = await response.json();
    return productSchema.parse(data);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
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
  const product = await fetchProduct(params.slug);
  if (!product) {
    const fallbackTitle = humanizeSlug(params.slug) || 'Product';
    const canonical = getCanonical(`/products/${params.slug}`);
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

  const title = product.name;
  const description = product.description;
  const canonical = getCanonical(`/products/${product.slug}`);
  const productUrl = abs(`/products/${product.slug}`);
  const ogImages = product.images?.length
    ? product.images.map((image, index) => ({
        url: abs(image),
        alt: `${product.name} image ${index + 1}`,
      }))
    : [{ url: abs('/api/og?title=' + encodeURIComponent(product.name)) }];

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
  const product = await fetchProduct(params.slug);

  const structuredData = productJsonLd(product ?? null);
  const resolvedProductId = product?.id ?? params.slug;

  return (
    <>
      <JsonLd id="product-jsonld" data={structuredData} />
      <div className="space-y-12">
        <ProductDetail slug={params.slug} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <ReviewStats productId={resolvedProductId} />
          <ReviewForm productId={resolvedProductId} />
        </div>
        <ReviewList productId={resolvedProductId} pageSize={5} />
      </div>
    </>
  );
}
