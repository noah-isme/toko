import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import { CartView } from '@/components/cart-view';
import { CustomerGuard } from '@/components/customer-guard';
import { localeAlternates } from '@/shared/seo/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'seo.cart' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: { languages: localeAlternates('/cart') },
  };
}

export default function CartPage() {
  return (
    <CustomerGuard>
      <CartView />
    </CustomerGuard>
  );
}
