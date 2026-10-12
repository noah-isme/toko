'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { getGuestAddressOwnerId } from '@/entities/address/storage';
import { AddressBook } from '@/entities/address/ui/AddressBook';

export default function AccountAddressesPage() {
  const t = useTranslations('account');
  const { user } = useAuth();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    // If user is logged in, use their ID
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnerId(user.id);
      return;
    }

    // Otherwise check for guest ID. This reads client-only storage, so it must
    // run post-mount to avoid a hydration mismatch.
    if (typeof window !== 'undefined') {
      setOwnerId(getGuestAddressOwnerId());
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('addresses.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('addresses.description')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account">{t('backToAccount')}</Link>
        </Button>
      </div>
      <AddressBook userIdOrGuestId={ownerId} context="account" />
    </div>
  );
}
