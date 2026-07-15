'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Locate, MapPin } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { addressInputSchema, type AddressInput } from '../schemas';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationPicker } from '@/components/ui/location-picker';
import { indonesiaRegions } from '@/entities/address/data/id-region';
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

type LocationResult = {
  id: string;
  displayName: string;
  city?: string;
  province?: string;
  postalCode?: string;
  line1?: string;
  lat?: number;
  lon?: number;
};

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
    mode: 'onChange',
    reValidateMode: 'onChange',
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
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPostalChecking, setIsPostalChecking] = useState(false);
  const lastPostalCheckRef = useRef<string | null>(null);
  const locationContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const watchedCity = useWatch({ control: form.control, name: 'city' });
  const watchedProvince = useWatch({ control: form.control, name: 'province' });
  const watchedPostalCode = useWatch({ control: form.control, name: 'postalCode' });

  const regionMatch = useMemo(() => {
    const provinceName = normalizeText(watchedProvince ?? '');
    const cityName = normalizeText(watchedCity ?? '');
    if (!provinceName || !cityName) {
      return null;
    }

    const province = indonesiaRegions.find((entry) => normalizeText(entry.name) === provinceName);
    if (!province) {
      return null;
    }

    const city = province.cities.find((entry) => normalizeText(entry.name) === cityName);
    if (!city) {
      return null;
    }

    return { province, city };
  }, [watchedCity, watchedProvince]);

  const availableDistricts = regionMatch?.city.districts ?? [];
  const availableWards =
    availableDistricts.find(
      (district) => normalizeText(district.name) === normalizeText(selectedDistrict),
    )?.wards ?? [];

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

  useEffect(() => {
    setSelectedDistrict('');
    setSelectedWard('');
  }, [regionMatch?.city.name, regionMatch?.province.name]);

  useEffect(() => {
    if (!selectedDistrict) {
      setSelectedWard('');
    }
  }, [selectedDistrict]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(event.target as Node)
      ) {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 3) {
      setLocationResults([]);
      setIsLocationSearching(false);
      setLocationError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLocationSearching(true);
      setLocationError(null);
      try {
        const response = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error('Location search failed');
        }
        const data = await response.json();
        const results = Array.isArray(data) ? data : [];
        const mapped = results.map((result, index) => {
          const address = result?.address ?? {};
          const city =
            address.city || address.town || address.village || address.county || undefined;
          const province = address.state || undefined;
          const postalCode = address.postcode ? normalizePostalCode(address.postcode) : undefined;
          const line1 = address.road || address.suburb || address.neighbourhood || undefined;

          return {
            id: String(result.place_id ?? index),
            displayName: result.display_name ?? trimmed,
            city,
            province,
            postalCode,
            line1,
            lat: result.lat ? Number(result.lat) : undefined,
            lon: result.lon ? Number(result.lon) : undefined,
          } satisfies LocationResult;
        });
        setLocationResults(mapped);
        setIsLocationOpen(true);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setLocationError('Tidak dapat memuat saran lokasi. Coba lagi.');
        }
      } finally {
        setIsLocationSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery]);

  const handleLocationPick = (result: LocationResult) => {
    setLocationQuery(result.displayName);
    setIsLocationOpen(false);
    setLocationResults([]);

    if (result.line1 && !form.getValues('line1')) {
      form.setValue('line1', result.line1, { shouldValidate: true, shouldDirty: true });
    }
    if (result.city) {
      form.setValue('city', result.city, { shouldValidate: true, shouldDirty: true });
    }
    if (result.province) {
      form.setValue('province', result.province, { shouldValidate: true, shouldDirty: true });
    }
    if (result.postalCode) {
      form.setValue('postalCode', result.postalCode, { shouldValidate: true, shouldDirty: true });
    }
    form.clearErrors(['line1', 'city', 'province', 'postalCode']);

    if (typeof result.lat === 'number' && typeof result.lon === 'number') {
      setMapPosition([result.lat, result.lon]);
      setShowMap(true);
    }
  };

  useEffect(() => {
    const city = watchedCity?.trim();
    const province = watchedProvince?.trim();
    const postalCode = watchedPostalCode?.trim();
    if (!city || !province || !postalCode) {
      setIsPostalChecking(false);
      return;
    }

    const normalizedPostal = normalizePostalCode(postalCode);
    const wardPostal = availableWards.find(
      (ward) => normalizeText(ward.name) === normalizeText(selectedWard),
    )?.postalCode;
    const key = `${normalizedPostal}|${city.toLowerCase()}|${province.toLowerCase()}`;

    if (wardPostal && normalizePostalCode(wardPostal) === normalizedPostal) {
      form.clearErrors('postalCode');
      lastPostalCheckRef.current = key;
      setIsPostalChecking(false);
      return;
    }

    if (lastPostalCheckRef.current === key) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsPostalChecking(true);
      try {
        const response = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(
            `${normalizedPostal} ${city} ${province}`,
          )}&limit=1`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error('Postal validation failed');
        }
        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : null;
        const resultPostal = result?.address?.postcode
          ? normalizePostalCode(result.address.postcode)
          : '';
        const isValid = Boolean(resultPostal && resultPostal === normalizedPostal);
        const currentError = form.getFieldState('postalCode').error;

        if (!isValid) {
          if (!currentError || currentError.type === 'validate') {
            form.setError('postalCode', {
              type: 'validate',
              message: 'Kode pos tidak cocok dengan kota/provinsi.',
            });
          }
        } else if (currentError?.type === 'validate') {
          form.clearErrors('postalCode');
        }
        lastPostalCheckRef.current = key;
      } catch (error) {
        // Ignore errors for now to avoid blocking checkout flow.
      } finally {
        setIsPostalChecking(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [availableWards, form, selectedWard, watchedCity, watchedPostalCode, watchedProvince]);

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
        form.setValue(
          'city',
          address.city || address.town || address.village || address.county || '',
        );
        form.setValue('province', address.state || '');
        form.setValue('postalCode', address.postcode ? normalizePostalCode(address.postcode) : '');

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

  const handleUseCurrentLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      pushToast({
        title: 'Lokasi tidak tersedia',
        description: 'Perangkat Anda belum mendukung deteksi lokasi otomatis.',
        variant: 'destructive',
      });
      return;
    }

    setIsLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = position.coords;
      setMapPosition([latitude, longitude]);
      setShowMap(true);
      await handleLocationSelect(latitude, longitude);
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error && 'code' in error
          ? (error as { code?: number }).code
          : undefined;
      const message =
        errorCode === 1
          ? 'Izin lokasi ditolak. Silakan izinkan akses lokasi di browser Anda.'
          : errorCode === 2
            ? 'Posisi tidak tersedia. Coba lagi nanti.'
            : errorCode === 3
              ? 'Waktu permintaan lokasi habis.'
              : 'Gagal mendeteksi lokasi otomatis.';
      pushToast({
        title: 'Gagal mendeteksi lokasi',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleDistrictChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(event.target.value);
  };

  const handleWardChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextWard = event.target.value;
    setSelectedWard(nextWard);

    const ward = availableWards.find(
      (entry) => normalizeText(entry.name) === normalizeText(nextWard),
    );

    if (ward?.postalCode) {
      form.setValue('postalCode', ward.postalCode, { shouldValidate: true, shouldDirty: true });
      form.clearErrors('postalCode');
    }

    const existingLine2 = form.getValues('line2')?.trim();
    if (!existingLine2 && selectedDistrict && nextWard) {
      form.setValue('line2', `Kec. ${selectedDistrict}, Kel. ${nextWard}`, {
        shouldValidate: true,
        shouldDirty: true,
      });
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-medium">Lokasi Peta</h3>
            <p className="text-sm text-muted-foreground">
              Pilih lokasi di peta untuk mengisi alamat otomatis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={showMap ? 'secondary' : 'outline'}
              onClick={() => setShowMap(!showMap)}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              {showMap ? 'Tutup Peta' : 'Buka Peta'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={isLocating || isGeocoding}
              className="gap-2"
            >
              <Locate className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Mendeteksi lokasi...' : 'Gunakan lokasi saya'}
            </Button>
          </div>
        </div>

        {showMap && (
          <div className="duration-200 animate-in fade-in zoom-in-95">
            <LocationPicker
              onPositionChange={handleLocationSelect}
              initialPosition={mapPosition ?? undefined}
              className="border-border shadow-sm"
            />
            {isGeocoding && (
              <p className="mt-2 animate-pulse text-xs text-muted-foreground">
                Mengambil detail alamat...
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${formId}-location`}>
          Cari lokasi
        </label>
        <div ref={locationContainerRef} className="relative">
          <Input
            id={`${formId}-location`}
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            onFocus={() => setIsLocationOpen(true)}
            placeholder="Ketik kota atau kode pos"
            autoComplete="off"
          />
          {isLocationOpen &&
          (locationResults.length > 0 || isLocationSearching || locationError) ? (
            <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover p-2 text-sm shadow-lg">
              {isLocationSearching ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Memuat saran...</p>
              ) : null}
              {locationError ? (
                <p className="px-2 py-2 text-xs text-destructive">{locationError}</p>
              ) : null}
              {locationResults.length > 0 ? (
                <ul className="max-h-56 overflow-y-auto">
                  {locationResults.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => handleLocationPick(result)}
                        className="w-full rounded-md px-2 py-2 text-left hover:bg-accent"
                      >
                        <p className="text-sm font-medium">{result.city || result.displayName}</p>
                        <p className="text-xs text-muted-foreground">{result.displayName}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!isLocationSearching && !locationError && locationResults.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Tidak ada saran.</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Gunakan dropdown untuk mengisi kota, provinsi, dan kode pos.
        </p>
      </div>

      {availableDistricts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-sm font-medium">
            <label htmlFor={`${formId}-district`}>Kecamatan</label>
            <select
              id={`${formId}-district`}
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Pilih kecamatan</option>
              {availableDistricts.map((district) => (
                <option key={district.name} value={district.name}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 text-sm font-medium">
            <label htmlFor={`${formId}-ward`}>Kelurahan</label>
            <select
              id={`${formId}-ward`}
              value={selectedWard}
              onChange={handleWardChange}
              disabled={!selectedDistrict}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Pilih kelurahan</option>
              {availableWards.map((ward) => (
                <option key={ward.name} value={ward.name}>
                  {ward.name} - {ward.postalCode}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Pilih kecamatan/kelurahan agar kode pos terisi otomatis.
          </p>
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
      {isPostalChecking ? (
        <p className="text-xs text-muted-foreground">Memeriksa kecocokan kode pos...</p>
      ) : null}
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
        label="Menyimpan alamat..."
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

function normalizePostalCode(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}
