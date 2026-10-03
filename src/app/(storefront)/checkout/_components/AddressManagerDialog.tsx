'use client';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Kelola alamat</DialogTitle>
          <DialogDescription>
            Pilih atau buat alamat baru, lalu gunakan untuk checkout.
          </DialogDescription>
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
          deleteDisabledMessage="Alamat ini sedang digunakan saat checkout."
          context="checkout"
        />
      </DialogContent>
    </Dialog>
  );
}
