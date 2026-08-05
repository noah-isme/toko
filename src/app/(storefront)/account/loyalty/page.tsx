'use client';

import { LazyWrapper, LazyLoyaltyDashboard } from '@/components/lazy-components';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export default function LoyaltyPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: 'Beranda', href: '/' }, { label: 'Akun', href: '/account' }, { label: 'Loyalitas' }]} />
      <div>
        <h1 className="text-2xl font-bold">Program Loyalitas</h1>
        <p className="text-sm text-muted-foreground">
          Kelola poin, tier, dan klaim hadiah Anda
        </p>
      </div>

      <LazyWrapper>
        <LazyLoyaltyDashboard />
      </LazyWrapper>
    </div>
  );
}