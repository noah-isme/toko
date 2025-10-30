'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { AddressSchema } from '@/entities/checkout/schemas';
import type { Address } from '@/entities/checkout/schemas';
import { cn } from '@/lib/utils';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { GuardedButton } from '@/shared/ui/GuardedButton';

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

  const errors = form.formState.errors;

  const fullNameError = errors.fullName?.message;
  const fullNameErrorId = fullNameError ? 'fullName-error' : undefined;
  const phoneError = errors.phone?.message;
  const phoneErrorId = phoneError ? 'phone-error' : undefined;
  const provinceError = errors.province?.message;
  const provinceErrorId = provinceError ? 'province-error' : undefined;
  const cityError = errors.city?.message;
  const cityErrorId = cityError ? 'city-error' : undefined;
  const districtError = errors.district?.message;
  const districtErrorId = districtError ? 'district-error' : undefined;
  const postalCodeError = errors.postalCode?.message;
  const postalCodeErrorId = postalCodeError ? 'postalCode-error' : undefined;
  const detailError = errors.detail?.message;
  const detailErrorId = detailError ? 'detail-error' : undefined;

  const fullNameField = applyFieldA11y('fullName', fullNameErrorId);
  const phoneField = applyFieldA11y('phone', phoneErrorId);
  const provinceField = applyFieldA11y('province', provinceErrorId);
  const cityField = applyFieldA11y('city', cityErrorId);
  const districtField = applyFieldA11y('district', districtErrorId);
  const postalCodeField = applyFieldA11y('postalCode', postalCodeErrorId);
  const detailField = applyFieldA11y('detail', detailErrorId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.root?.message ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors.root.message}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" fieldId="fullName" error={fullNameError} errorId={fullNameErrorId}>
          <Input
            {...form.register('fullName')}
            {...fullNameField}
            placeholder="Nama penerima"
            autoComplete="name"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Phone" fieldId="phone" error={phoneError} errorId={phoneErrorId}>
          <Input
            {...form.register('phone')}
            {...phoneField}
            placeholder="08xxxxxxxxxx"
            autoComplete="tel"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Province" fieldId="province" error={provinceError} errorId={provinceErrorId}>
          <Input
            {...form.register('province')}
            {...provinceField}
            placeholder="Provinsi"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="City" fieldId="city" error={cityError} errorId={cityErrorId}>
          <Input
            {...form.register('city')}
            {...cityField}
            placeholder="Kota"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="District" fieldId="district" error={districtError} errorId={districtErrorId}>
          <Input
            {...form.register('district')}
            {...districtField}
            placeholder="Kecamatan"
            disabled={isSubmitting}
          />
        </Field>
        <Field
          label="Postal Code"
          fieldId="postalCode"
          error={postalCodeError}
          errorId={postalCodeErrorId}
        >
          <Input
            {...form.register('postalCode')}
            {...postalCodeField}
            placeholder="Kode Pos"
            autoComplete="postal-code"
            disabled={isSubmitting}
          />
        </Field>
      </div>
      <Field label="Address Detail" fieldId="detail" error={detailError} errorId={detailErrorId}>
        <textarea
          {...form.register('detail')}
          {...detailField}
          className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Nama jalan, nomor rumah, patokan"
          disabled={isSubmitting}
        />
      </Field>
      <div className="flex justify-end">
        <GuardedButton
          type="submit"
          size="lg"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          loadingLabel={submitLabel}
        >
          {submitLabel}
        </GuardedButton>
      </div>
    </form>
  );
}

interface FieldProps {
  fieldId: string;
  label: string;
  error?: string;
  errorId?: string;
  children: ReactNode;
}

function applyFieldA11y(name: string, errorId?: string) {
  const attributes = fieldA11y(name, errorId);
  return {
    id: attributes.id,
    name: attributes.name,
    'aria-invalid': attributes['aria-invalid'],
    'aria-describedby': attributes['aria-describedby'],
  } as const;
}

function Field({ fieldId, label, error, errorId, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2 text-sm font-medium', 'scroll-mt-28')}>
      <label htmlFor={fieldId}>{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
