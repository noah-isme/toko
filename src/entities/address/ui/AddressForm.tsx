'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin } from 'lucide-react';

import { LocationPicker } from '@/components/ui/location-picker';
import { Button } from '@/components/ui/button';

import { addressInputSchema, type AddressInput } from '../schemas';

import { Input } from '@/components/ui/input';
import { DelayedLoader } from '@/shared/ui/DelayedLoader';
import { fieldA11y } from '@/shared/ui/forms/accessibility';
import { GuardedButton } from '@/shared/ui/GuardedButton';
import { useToast } from '@/shared/ui/toast';

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
  const { toast: pushToast } = useToast();
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

  const [showMap, setShowMap] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

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

  const handleLocationSelect = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);

      if (!response.ok) throw new Error('Failed to fetch address');

      const data = await response.json();
      const address = data.address;

      // Map Nominatim fields to our schema
      if (address) {
        form.setValue('line1', address.road || address.suburb || '');
        form.setValue('city', address.city || address.town || address.village || address.county || '');
        form.setValue('province', address.state || '');
        form.setValue('postalCode', address.postcode || '');

        // Helper to clear error if value exists
        if (address.road) form.clearErrors('line1');
        if (address.city || address.town) form.clearErrors('city');
        if (address.state) form.clearErrors('province');
        if (address.postcode) form.clearErrors('postalCode');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      pushToast({
        title: 'Gagal mengambil alamat',
        description: 'Coba lagi atau isi alamat secara manual.',
        variant: 'destructive',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

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

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-medium">Lokasi Peta</h3>
            <p className="text-sm text-muted-foreground">
              Pilih lokasi di peta untuk mengisi alamat otomatis
            </p>
          </div>
          <Button
            type="button"
            variant={showMap ? "secondary" : "outline"}
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            {showMap ? 'Tutup Peta' : 'Buka Peta'}
          </Button>
        </div>

        {showMap && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <LocationPicker
              onPositionChange={handleLocationSelect}
              className="border-border shadow-sm"
            />
            {isGeocoding && (
              <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                Mengambil detail alamat...
              </p>
            )}
          </div>
        )}
      </div>

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
