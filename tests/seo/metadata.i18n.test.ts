import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/i18n/config';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

/**
 * Re-mocks `next-intl/server` so `getLocale()` resolves to `locale`. The page modules pass that
 * locale to `getTranslations({ locale, namespace })`, which the shared mock renders from the
 * real catalog for that locale.
 */
function useRequestLocale(locale: Locale) {
  vi.doMock('next-intl/server', async (importOriginal) => {
    const { createNextIntlServerMock } = await import('../utils/next-intl-mock');
    const core = await vi.importActual<typeof import('next-intl')>('next-intl');
    const server = createNextIntlServerMock(
      await importOriginal<typeof import('next-intl/server')>(),
      core,
    );
    return { ...server, getLocale: async () => locale };
  });
}

async function loadPages() {
  const [layout, cart, featured, products, product] = await Promise.all([
    import('@/app/layout'),
    import('@/app/(storefront)/cart/page'),
    import('@/app/(storefront)/featured-products/page'),
    import('@/app/(storefront)/products/page'),
    import('@/app/(storefront)/products/[slug]/page'),
  ]);
  return { layout, cart, featured, products, product };
}

const productParams = () => ({ params: Promise.resolve({ slug: 'macbook-pro-14-m3' }) });

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  process.env.NEXT_PUBLIC_API_URL = 'mock';
  vi.resetModules();
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  vi.doUnmock('next-intl/server');
  vi.resetModules();
});

describe('storefront metadata in the default locale (id)', () => {
  it('keeps the current titles, descriptions and URLs', async () => {
    const { layout, cart, featured, products } = await loadPages();

    const root = await layout.generateMetadata();
    expect(root.description).toBe('Modern modular storefront for the toko e-commerce experience.');
    expect(root.openGraph?.images).toEqual([
      {
        url: 'https://example.com/api/og',
        width: 1200,
        height: 630,
        alt: 'toko default preview image',
      },
    ]);
    expect(root.alternates).toBeUndefined();

    const cartMeta = await cart.generateMetadata();
    expect(cartMeta.title).toBe('Keranjang Belanja');
    expect(cartMeta.description).toBe(
      'Tinjau produk di keranjang belanja Anda sebelum melanjutkan ke pembayaran.',
    );

    const featuredMeta = await featured.generateMetadata();
    expect(featuredMeta.title).toBe('Koleksi Pilihan');
    expect(featuredMeta.description).toBe(
      'Produk pilihan toko, dikurasi untuk keseharian yang lebih baik.',
    );

    const productsMeta = await products.generateMetadata();
    expect(productsMeta.title).toBe('Products');
    expect(productsMeta.alternates?.canonical).toBe('https://example.com/products');
    expect(productsMeta.openGraph?.images).toEqual([
      { url: 'https://example.com/api/og?title=Products' },
    ]);
  }, 15_000);
});

describe('storefront metadata when the locale is en', () => {
  beforeEach(() => useRequestLocale('en'));

  it('renders English titles and descriptions', async () => {
    const { layout, cart, featured, products } = await loadPages();

    const root = await layout.generateMetadata();
    expect(root.description).toBe('Modern modular storefront for the toko e-commerce experience.');
    expect(root.openGraph?.images).toEqual([
      expect.objectContaining({ url: 'https://example.com/api/og?locale=en' }),
    ]);

    const cartMeta = await cart.generateMetadata();
    expect(cartMeta.title).toBe('Shopping Cart');
    expect(cartMeta.description).toBe(
      'Review the products in your shopping cart before proceeding to checkout.',
    );

    const featuredMeta = await featured.generateMetadata();
    expect(featuredMeta.title).toBe('Featured Collection');
    expect(featuredMeta.description).toBe(
      'Hand-picked toko products, curated for better everyday living.',
    );

    const productsMeta = await products.generateMetadata();
    expect(productsMeta.title).toBe('Products');
    expect(productsMeta.openGraph?.images).toEqual([
      { url: 'https://example.com/api/og?title=Products&locale=en' },
    ]);
  }, 15_000);

  it('points canonical URLs at the /en page and keeps hreflang alternates', async () => {
    const { cart, featured, products, product } = await loadPages();

    expect((await cart.generateMetadata()).alternates?.languages).toEqual({
      id: 'https://example.com/cart',
      en: 'https://example.com/en/cart',
      'x-default': 'https://example.com/cart',
    });
    expect((await featured.generateMetadata()).alternates?.languages).toEqual({
      id: 'https://example.com/featured-products',
      en: 'https://example.com/en/featured-products',
      'x-default': 'https://example.com/featured-products',
    });

    const productsMeta = await products.generateMetadata();
    expect(productsMeta.alternates).toEqual({
      canonical: 'https://example.com/en/products',
      languages: {
        id: 'https://example.com/products',
        en: 'https://example.com/en/products',
        'x-default': 'https://example.com/products',
      },
    });

    const productMeta = await product.generateMetadata(productParams());
    expect(productMeta.alternates).toEqual({
      canonical: 'https://example.com/en/products/macbook-pro-14-m3',
      languages: {
        id: 'https://example.com/products/macbook-pro-14-m3',
        en: 'https://example.com/en/products/macbook-pro-14-m3',
        'x-default': 'https://example.com/products/macbook-pro-14-m3',
      },
    });
    expect(productMeta.openGraph?.url).toBe('https://example.com/en/products/macbook-pro-14-m3');
  }, 15_000);
});
