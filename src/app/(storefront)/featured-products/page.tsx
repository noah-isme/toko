import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { FeaturedProducts } from '@/components/featured-products';
import { localeAlternates } from '@/shared/seo/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'seo.featured' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: { languages: localeAlternates('/featured-products') },
  };
}

export default function FeaturedProductsPage() {
  return <FeaturedProducts />;
}
