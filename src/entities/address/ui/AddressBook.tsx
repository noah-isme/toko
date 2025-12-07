'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  useAddressListQuery,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
  useUpdateAddressMutation,
} from '../hooks';
import type { AddressInput, AddressUpdateInput } from '../schemas';
import { getGuestAddressOwnerId } from '../storage';
import type { Address } from '../types';

import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { normalizeError } from '@/shared/lib/normalizeError';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { BaseSkeleton } from '@/shared/ui/skeletons/BaseSkeleton';



export interface AddressBookProps {
  userIdOrGuestId?: string | null;
  selectable?: boolean;
  selectedAddressId?: string | null;
  onSelectAddress?: (address: Address) => void;
  disableDeleteIds?: string[];
  deleteDisabledMessage?: string;
  heading?: string;
  description?: string;
  className?: string;
  context?: 'account' | 'checkout';
}

export function AddressBook({
  userIdOrGuestId,
  selectable,
  selectedAddressId,
  onSelectAddress,
  disableDeleteIds,
  deleteDisabledMessage = 'Alamat sedang digunakan. Pilih alamat lain sebelum menghapus.',
  heading = 'Buku alamat',
  description = 'Kelola alamat pengiriman agar checkout lebih cepat.',
  className,
  context = 'account',
}: AddressBookProps) {
  const ownerId = useMemo(() => {
    if (userIdOrGuestId) {
      return userIdOrGuestId;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    return getGuestAddressOwnerId();
  }, [userIdOrGuestId]);

  const {
    data: addresses = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAddressListQuery(ownerId);
  const createMutation = useCreateAddressMutation(ownerId, { context });
  const updateMutation = useUpdateAddressMutation(ownerId, { context });
  const deleteMutation = useDeleteAddressMutation(ownerId, { context });
  const setDefaultMutation = useSetDefaultAddressMutation(ownerId, { context });

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    setDefaultMutation.isPending;

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const disableDeleteSet = useMemo(() => new Set(disableDeleteIds ?? []), [disableDeleteIds]);

  const handleCreate = useCallback(
    async (values: AddressInput) => {
      await createMutation.mutateAsync({
        ...values,
        clientRequestId: crypto.randomUUID(),
      });
      setCreateOpen(false);
    },
    [createMutation],
  );

  const handleUpdate = useCallback(
    async (values: AddressInput) => {
      if (!editingAddress) {
        return;
      }
      const payload = buildUpdatePayload(values, editingAddress);
      if (Object.keys(payload).length === 0) {
        setEditingAddress(null);
        return;
      }

      await updateMutation.mutateAsync({ id: editingAddress.id, input: payload });
      setEditingAddress(null);
    },
    [editingAddress, updateMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteMutation, deleteTarget]);

  const handleCancelDelete = useCallback(() => setDeleteTarget(null), []);

  const handleSelectAddress = useCallback(
    (address: Address) => {
      onSelectAddress?.(address);
    },
    [onSelectAddress],
  );

  const handleSetDefault = useCallback(
    (address: Address) => {
      setDefaultMutation.mutate(address.id);
    },
    [setDefaultMutation],
  );

  const showEmptyState = !isLoading && addresses.length === 0;
  const hasError = Boolean(error);
  const busyLabel = useMemo(() => {
    if (createMutation.isPending) return 'Menyimpan alamat baru…';
    if (updateMutation.isPending) return 'Memperbarui alamat…';
    if (deleteMutation.isPending) return 'Menghapus alamat…';
    if (setDefaultMutation.isPending) return 'Mengatur default…';
    return 'Sinkronisasi alamat…';
  }, [
    createMutation.isPending,
    deleteMutation.isPending,
    setDefaultMutation.isPending,
    updateMutation.isPending,
  ]);

  return (
    <section className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{heading}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah alamat
        </Button>
      </div>
      {hasError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive" role="alert">
            {normalizeError(error)}
          </p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <AddressSkeletonGrid />
      ) : showEmptyState ? (
        <div className="space-y-4">
          <EmptyState
            icon={<Plus className="h-8 w-8" aria-hidden="true" />}
            title="Belum ada alamat tersimpan"
            description="Tambahkan alamat baru agar checkout lebih cepat di masa depan."
          />
          <div className="flex justify-center">
            <Button onClick={() => setCreateOpen(true)}>Tambah alamat pertama</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selectable={selectable}
              isSelected={selectedAddressId === address.id}
              onSelect={selectable ? handleSelectAddress : undefined}
              onEdit={(addr) => setEditingAddress(addr)}
              onDelete={(addr) => setDeleteTarget(addr)}
              onSetDefault={handleSetDefault}
              disableDelete={disableDeleteSet.has(address.id)}
              disableDeleteReason={
                disableDeleteSet.has(address.id) ? deleteDisabledMessage : undefined
              }
              disableActions={isMutating}
            />
          ))}
        </div>
      )}
      <DelayedLoader active={isMutating} label={busyLabel} className="text-xs" />
      <CreateAddressSheet
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={handleCreate}
      />
      <EditAddressDialog
        address={editingAddress}
        onClose={() => setEditingAddress(null)}
        isSubmitting={updateMutation.isPending}
        onSubmit={handleUpdate}
      />
      <DeleteConfirmationDialog
        address={deleteTarget}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </section>
  );
}

function CreateAddressSheet({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: AddressInput) => Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto sm:h-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Tambah alamat</SheetTitle>
          <SheetDescription>Lengkapi detail alamat pengiriman Anda.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <AddressForm
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Simpan alamat"
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditAddressDialog({
  address,
  onClose,
  isSubmitting,
  onSubmit,
}: {
  address: Address | null;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: (values: AddressInput) => Promise<void>;
}) {
  return (
    <Dialog open={Boolean(address)} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit alamat</DialogTitle>
          <DialogDescription>Perbarui detail alamat Anda.</DialogDescription>
        </DialogHeader>
        {address ? (
          <AddressForm
            defaultValues={addressToInput(address)}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Perbarui alamat"
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmationDialog({
  address,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  address: Address | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={Boolean(address)} onOpenChange={(next) => (!next ? onCancel() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus alamat</DialogTitle>
          <DialogDescription>
            Alamat ini akan dihapus dari akun Anda dan tidak bisa dipakai di checkout.
          </DialogDescription>
        </DialogHeader>
        {address ? (
          <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{address.fullName}</p>
            <p className="text-muted-foreground">{address.line1}</p>
            {address.line2 ? <p className="text-muted-foreground">{address.line2}</p> : null}
          </div>
        ) : null}
        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Batal
          </Button>
          <GuardedButton
            type="button"
            variant="destructive"
            onClick={onConfirm}
            isLoading={isDeleting}
            loadingLabel="Menghapus…"
          >
            Hapus
          </GuardedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddressSkeletonGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`address-skeleton-${index}`} className="space-y-3 rounded-lg border p-4">
          <BaseSkeleton className="h-5 w-1/3" />
          <BaseSkeleton className="h-4 w-2/3" />
          <BaseSkeleton className="h-3 w-full" />
          <BaseSkeleton className="h-3 w-3/4" />
          <div className="flex gap-2">
            <BaseSkeleton className="h-9 w-24" />
            <BaseSkeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildUpdatePayload(values: AddressInput, previous: Address): AddressUpdateInput {
  const payload: AddressUpdateInput = {};
  (Object.keys(values) as (keyof AddressInput)[]).forEach((key) => {
    const nextValue = values[key];
    const prevValue = (previous as unknown as Record<string, unknown>)[key];
    if (normalizeValue(nextValue) !== normalizeValue(prevValue)) {
      const typedKey = key as keyof AddressUpdateInput;
      (payload as any)[typedKey] = nextValue;
    }
  });
  return payload;
}

function normalizeValue(value: unknown) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

function addressToInput(address: Address): AddressInput {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    country: address.country,
  };
}
