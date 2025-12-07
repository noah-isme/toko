'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';

import { addressInputSchema, type AddressInput } from '../schemas';

import { Input } from '@/components/ui/input';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { GuardedButton } from '@/shared/ui/GuardedButton';


interface AddressFormProps {
  defaultValues?: Partial<AddressInput>;
  onSubmit: (values: AddressInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export function AddressForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Simpan alamat',
  cancelLabel = 'Batal',
}: AddressFormProps) {
  const formId = useId();
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressInputSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'ID',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        fullName: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'ID',
        ...defaultValues,
      });
    }
  }, [defaultValues, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(addressInputSchema.parse(values));
  });

  const { errors } = form.formState;

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-busy={isSubmitting ? 'true' : undefined}
    >
      {errors.root?.message ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errors.root.message}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nama penerima"
          name="fullName"
          error={errors.fullName?.message}
          autoComplete="name"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Nomor telepon"
          name="phone"
          error={errors.phone?.message}
          autoComplete="tel"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Alamat utama"
          name="line1"
          error={errors.line1?.message}
          autoComplete="address-line1"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Detail alamat"
          name="line2"
          error={errors.line2?.message}
          autoComplete="address-line2"
          register={form.register}
          disabled={isSubmitting}
          optional
        />
        <Field
          label="Kota / Kabupaten"
          name="city"
          error={errors.city?.message}
          autoComplete="address-level2"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Provinsi"
          name="province"
          error={errors.province?.message}
          autoComplete="address-level1"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Kode pos"
          name="postalCode"
          error={errors.postalCode?.message}
          autoComplete="postal-code"
          register={form.register}
          disabled={isSubmitting}
        />
        <Field
          label="Negara"
          name="country"
          error={errors.country?.message}
          autoComplete="country-name"
          register={form.register}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel ? (
          <GuardedButton type="button" variant="ghost" disabled={isSubmitting} onClick={onCancel}>
            {cancelLabel}
          </GuardedButton>
        ) : null}
        <GuardedButton
          type="submit"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          loadingLabel={submitLabel}
        >
          {submitLabel}
        </GuardedButton>
      </div>
      <DelayedLoader
        active={Boolean(isSubmitting)}
        label="Menyimpan alamat…"
        delayMs={350}
        className="text-xs text-muted-foreground"
      />
    </form>
  );
}

type RegisterFn = ReturnType<typeof useForm<AddressInput>>['register'];

interface FieldProps {
  label: string;
  name: keyof AddressInput;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  optional?: boolean;
  register: RegisterFn;
}

function Field({ label, name, error, disabled, autoComplete, optional, register }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  const attributes = fieldA11y(String(name), errorId);

  return (
    <div className="flex flex-col gap-2 text-sm font-medium">
      <label htmlFor={attributes.id} className="flex items-center gap-1">
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
        ) : null}
      </label>
      <Input
        {...register(name)}
        {...attributes}
        placeholder={label}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
