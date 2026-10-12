'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Address as SavedAddress } from '@/entities/address/types';
import { AddressBook } from '@/entities/address/ui/AddressBook';

export function AddressManagerDialog({
  open,
  onOpenChange,
  ownerId,
  selectedAddressId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string | null;
  selectedAddressId: string | null;
  onSelect: (address: SavedAddress) => Promise<void> | void;
}) {
  const t = useTranslations('checkout.addressManager');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <AddressBook
          userIdOrGuestId={ownerId}
          selectable
          selectedAddressId={selectedAddressId}
          onSelectAddress={async (address) => {
            await onSelect(address);
            onOpenChange(false);
          }}
          disableDeleteIds={selectedAddressId ? [selectedAddressId] : undefined}
          deleteDisabledMessage={t('deleteDisabled')}
          context="checkout"
        />
      </DialogContent>
    </Dialog>
  );
}
