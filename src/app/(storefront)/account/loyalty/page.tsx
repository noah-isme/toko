'use client';

import { useTranslations } from 'next-intl';

import { LazyWrapper, LazyLoyaltyDashboard } from '@/components/lazy-components';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export default function LoyaltyPage() {
  const t = useTranslations('account');
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: t('breadcrumb.home'), href: '/' },
          { label: t('breadcrumb.account'), href: '/account' },
          { label: t('breadcrumb.loyalty') },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold">{t('loyalty.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('loyalty.description')}</p>
      </div>

      <LazyWrapper>
        <LazyLoyaltyDashboard />
      </LazyWrapper>
    </div>
  );
}
