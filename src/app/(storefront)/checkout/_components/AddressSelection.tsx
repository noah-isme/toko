'use client';

import { formatAddressText } from '../_lib/address';

import { Button } from '@/components/ui/button';
import type { Address as SavedAddress } from '@/entities/address/types';
import { cn } from '@/lib/utils';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';

export function ShippingAddressSection({
  addresses,
  selectedAddress,
  selectedAddressId,
  isAddressLoading,
  isQuotePending,
  quoteErrorMessage,
  announcement,
  onManage,
  onSelect,
}: {
  addresses: SavedAddress[];
  selectedAddress: SavedAddress | null;
  selectedAddressId: string | null;
  isAddressLoading: boolean;
  isQuotePending: boolean;
  quoteErrorMessage?: string | null;
  announcement: string;
  onManage: () => void;
  onSelect: (address: SavedAddress) => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Alamat pengiriman</h2>
          <p className="text-sm text-muted-foreground">
            Pilih alamat untuk menghitung ongkir dan menyiapkan pesanan Anda.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onManage}>
            Kelola alamat
          </Button>
        </div>
      </div>
      {selectedAddress ? (
        <SelectedAddressSummary address={selectedAddress} isLoading={isQuotePending} />
      ) : isAddressLoading ? (
        <AddressSelectorSkeleton />
      ) : (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
          Belum ada alamat terpilih. Tambahkan alamat baru agar bisa melanjutkan checkout.
          <div className="mt-3">
            <Button size="sm" onClick={onManage}>
              Tambah alamat
            </Button>
          </div>
        </div>
      )}
      {addresses.length > 0 ? (
        <>
          <AddressSelectionList
            addresses={addresses.slice(0, 2)}
            selectedId={selectedAddressId}
            onSelect={onSelect}
            isBusy={isQuotePending}
          />
          {addresses.length > 2 ? (
            <Button type="button" variant="ghost" size="sm" onClick={onManage}>
              Lihat semua alamat
            </Button>
          ) : null}
        </>
      ) : null}
      {quoteErrorMessage ? <p className="text-sm text-destructive">{quoteErrorMessage}</p> : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

export function AddressSelectionList({
  addresses,
  selectedId,
  onSelect,
  isBusy,
}: {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (address: SavedAddress) => Promise<void> | void;
  isBusy: boolean;
}) {
  if (!addresses.length) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {addresses.map((address) => {
        const isActive = selectedId === address.id;
        return (
          <button
            key={address.id}
            type="button"
            data-address-item=""
            role="radio"
            aria-checked={isActive}
            disabled={isBusy && isActive}
            onClick={() => {
              void onSelect(address);
            }}
            className={cn(
              'text-left',
              'rounded-lg border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/60',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{address.receiverName}</p>
              {isActive ? <span className="text-xs font-medium text-primary">Dipakai</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">{address.phone}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatAddressText(
                address.addressLine1,
                address.addressLine2,
                address.city,
                address.province,
                address.postalCode,
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function SelectedAddressSummary({
  address,
  isLoading,
}: {
  address: SavedAddress;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{address.receiverName}</p>
          <p className="text-sm text-muted-foreground">{address.phone}</p>
        </div>
        {address.isDefault ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Alamat utama
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatAddressText(
          address.addressLine1,
          address.addressLine2,
          address.city,
          address.province,
          address.postalCode,
        )}
      </p>
      <DelayedLoader
        active={isLoading}
        label="Memuat opsi pengiriman…"
        className="mt-2 text-xs text-muted-foreground"
      />
    </div>
  );
}

export function AddressSelectorSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 p-4">
      <BaseSkeleton className="h-5 w-1/3" />
      <BaseSkeleton className="h-4 w-2/3" />
      <BaseSkeleton className="h-3 w-full" />
      <BaseSkeleton className="h-3 w-3/4" />
    </div>
  );
}
