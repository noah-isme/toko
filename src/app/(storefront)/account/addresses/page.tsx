'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getGuestAddressOwnerId } from '@/entities/address/storage';
import { AddressBook } from '@/entities/address/ui/AddressBook';

export default function AccountAddressesPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setOwnerId(getGuestAddressOwnerId());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Buku alamat</h1>
          <p className="text-sm text-muted-foreground">
            Tambahkan atau ubah alamat pengiriman agar checkout lebih cepat.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account">Kembali ke akun</Link>
        </Button>
      </div>
      <AddressBook userIdOrGuestId={ownerId} context="account" />
    </div>
  );
}
