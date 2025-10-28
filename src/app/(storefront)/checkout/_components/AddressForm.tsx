'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressSchema } from '@/entities/checkout/schemas';
import type { Address } from '@/entities/checkout/schemas';

export interface AddressFormProps {
  defaultValues?: Partial<Address>;
  onSubmit: (values: Address) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function AddressForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Get Shipping Options',
}: AddressFormProps) {
  const form = useForm<Address>({
    resolver: zodResolver(AddressSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      postalCode: '',
      detail: '',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        fullName: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        postalCode: '',
        detail: '',
        ...defaultValues,
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" error={form.formState.errors.fullName?.message}>
          <Input
            {...form.register('fullName')}
            placeholder="Nama penerima"
            autoComplete="name"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <Input
            {...form.register('phone')}
            placeholder="08xxxxxxxxxx"
            autoComplete="tel"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Province" error={form.formState.errors.province?.message}>
          <Input {...form.register('province')} placeholder="Provinsi" disabled={isSubmitting} />
        </Field>
        <Field label="City" error={form.formState.errors.city?.message}>
          <Input {...form.register('city')} placeholder="Kota" disabled={isSubmitting} />
        </Field>
        <Field label="District" error={form.formState.errors.district?.message}>
          <Input {...form.register('district')} placeholder="Kecamatan" disabled={isSubmitting} />
        </Field>
        <Field label="Postal Code" error={form.formState.errors.postalCode?.message}>
          <Input
            {...form.register('postalCode')}
            placeholder="Kode Pos"
            autoComplete="postal-code"
            disabled={isSubmitting}
          />
        </Field>
      </div>
      <Field label="Address Detail" error={form.formState.errors.detail?.message}>
        <textarea
          {...form.register('detail')}
          className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Nama jalan, nomor rumah, patokan"
          disabled={isSubmitting}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Loading...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
