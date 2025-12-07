'use client';

import { Check, Home, MapPin, Phone, Trash2 } from 'lucide-react';
import React, { memo, useCallback } from 'react';

import type { Address } from '../types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


export interface AddressCardProps {
  address: Address;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (address: Address) => void;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
  disableDelete?: boolean;
  disableDeleteReason?: string;
  disableActions?: boolean;
  className?: string;
}

export const AddressCard = memo(function AddressCard({
  address,
  selectable,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  disableDelete,
  disableDeleteReason,
  disableActions,
  className,
}: AddressCardProps) {
  const handleSelect = useCallback(() => {
    if (selectable && !disableActions) {
      onSelect?.(address);
    }
  }, [address, disableActions, onSelect, selectable]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selectable || disableActions) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(address);
      }
    },
    [address, disableActions, onSelect, selectable],
  );

  const actionDisabled = disableActions;
  const deleteBlocked = disableDelete || actionDisabled;

  return (
    <article
      role={selectable ? 'radio' : undefined}
      aria-checked={selectable ? Boolean(isSelected) : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex h-full flex-col rounded-lg border border-border px-4 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selectable
          ? isSelected
            ? 'border-primary shadow-sm'
            : 'cursor-pointer hover:border-primary/60'
          : 'bg-background',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold leading-tight text-foreground">
            {address.fullName}
          </p>
          <p className="text-xs text-muted-foreground">{formatPhone(address.phone)}</p>
        </div>
        <div className="flex items-center gap-2">
          {address.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              Default
            </span>
          ) : null}
          {selectable ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium',
                isSelected
                  ? 'border-primary/70 bg-primary/10 text-primary'
                  : 'border-muted-foreground/20 text-muted-foreground',
              )}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {isSelected ? 'Dipilih' : 'Pilih'}
            </span>
          ) : null}
        </div>
      </header>
      <div className="mt-4 space-y-1 text-sm text-foreground">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-medium">{address.line1}</p>
            {address.line2 ? <p className="text-muted-foreground">{address.line2}</p> : null}
            <p className="text-muted-foreground">
              {address.city}, {address.province}
            </p>
            <p className="text-muted-foreground">
              {address.postalCode} · {address.country}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" aria-hidden="true" />
          <span>{address.phone}</span>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {onSelect && selectable ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={isSelected || disableActions}
            aria-label={isSelected ? 'Alamat sudah dipilih' : 'Gunakan alamat ini'}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(address);
            }}
          >
            Gunakan
          </Button>
        ) : null}
        {onSetDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            disabled={address.isDefault || actionDisabled}
            aria-label={address.isDefault ? 'Alamat default' : 'Jadikan alamat default'}
            onClick={(event) => {
              event.stopPropagation();
              onSetDefault(address);
            }}
          >
            Jadikan default
          </Button>
        ) : null}
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={actionDisabled}
            aria-label={`Edit alamat ${address.fullName}`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(address);
            }}
          >
            Edit
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleteBlocked}
            aria-label={
              deleteBlocked
                ? (disableDeleteReason ?? 'Menghapus alamat dinonaktifkan')
                : `Hapus alamat ${address.fullName}`
            }
            title={disableDeleteReason}
            onClick={(event) => {
              event.stopPropagation();
              if (deleteBlocked) {
                return;
              }
              onDelete(address);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Hapus
          </Button>
        ) : null}
      </footer>
    </article>
  );
});

function formatPhone(value: string) {
  if (!value) {
    return '';
  }

  return value.replace(/(\d{3})(\d{3,4})(\d{3,4})/, '$1-$2-$3');
}
