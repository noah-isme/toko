import { abs, siteUrl } from './seo';

import type { Product } from '@/lib/api/schemas';

const SCHEMA_CONTEXT = 'https://schema.org';

export function orgJsonLd() {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Organization',
    name: 'toko',
    url: siteUrl,
    logo: abs('/api/og?logo=1'),
  } as const;
}

export function websiteJsonLd() {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: 'toko',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  } as const;
}

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[] | null | undefined) {
  if (!items || items.length === 0) {
    return null;
  }

  const itemListElement = items
    .filter((entry): entry is BreadcrumbItem => Boolean(entry?.name) && Boolean(entry?.item))
    .map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: abs(entry.item),
    }));

  if (itemListElement.length === 0) {
    return null;
  }

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement,
  } as const;
}

export interface ProductJsonLdInput
  extends Pick<
    Product,
    'id' | 'name' | 'slug' | 'description' | 'price' | 'images' | 'inventory' | 'categories'
  > {
  brand?: string;
  url?: string;
}

export function productJsonLd(product: ProductJsonLdInput | null | undefined) {
  if (!product || !product.price || typeof product.price.amount !== 'number') {
    return null;
  }

  const priceCurrency = 'IDR';
  const productUrl = product.url ?? abs(`/products/${product.slug}`);
  const availability =
    product.inventory > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean).map((image) => abs(image))
    : [];

  const offers = {
    '@type': 'Offer',
    url: productUrl,
    priceCurrency,
    price: Number.isFinite(product.price.amount) ? product.price.amount.toFixed(2) : undefined,
    availability,
    itemCondition: 'https://schema.org/NewCondition',
  };

  if (!offers.price) {
    return null;
  }

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.id,
    url: productUrl,
    image: images.length ? images : undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand ?? 'toko',
    },
    category: product.categories?.length ? product.categories.join(', ') : undefined,
    offers,
  } as const;
}

export interface OrderJsonLdInput {
  orderId: string;
  url?: string;
  total: number;
  currency?: string;
  acceptedOffers?: Array<{
    name?: string;
    price?: number;
    sku?: string;
    quantity?: number;
  }>;
}

export function orderJsonLd(order: OrderJsonLdInput | null | undefined) {
  if (!order || !order.orderId || !Number.isFinite(order.total)) {
    return null;
  }

  const priceCurrency = 'IDR';
  const orderUrl = order.url ?? abs(`/orders/${encodeURIComponent(order.orderId)}`);

  const acceptedOffer = (order.acceptedOffers ?? [])
    .filter((entry) => Number.isFinite(entry?.price))
    .map((entry) => ({
      '@type': 'Offer',
      priceCurrency,
      price: entry?.price?.toFixed(2),
      itemOffered: entry?.name
        ? {
            '@type': 'Product',
            name: entry.name,
            sku: entry.sku,
          }
        : undefined,
      acceptedPaymentMethod: 'https://schema.org/CreditCard',
      eligibleQuantity: entry?.quantity
        ? {
            '@type': 'QuantitativeValue',
            value: entry.quantity,
          }
        : undefined,
    }));

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Order',
    orderNumber: order.orderId,
    url: orderUrl,
    priceCurrency,
    price: order.total.toFixed(2),
    acceptedOffer: acceptedOffer.length ? acceptedOffer : undefined,
    customer: {
      '@type': 'Person',
      name: 'Customer',
    },
  } as const;
}
