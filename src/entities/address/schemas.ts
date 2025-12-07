import { z } from 'zod';

import type { Address } from './types';

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const requiredText = (field: string, max = 120) =>
  z
    .string({
      message: `${field} wajib diisi`,
    })
    .trim()
    .min(1, `${field} wajib diisi`)
    .max(max, `${field} terlalu panjang`)
    .transform(normalizeWhitespace);

const phoneRegex = /^[+\d().\-\s]{6,20}$/;
const postalCodeRegex = /^[A-Za-z0-9\-\s]{3,12}$/;

const fullNameSchema = requiredText('Nama lengkap', 120);
const lineSchema = requiredText('Alamat', 160);
const citySchema = requiredText('Kota', 80);
const provinceSchema = requiredText('Provinsi', 80);
const countrySchema = requiredText('Negara', 80);

const optionalLineSchema = z
  .string()
  .trim()
  .max(160, 'Detail alamat terlalu panjang')
  .transform((value) => {
    const normalized = normalizeWhitespace(value);
    return normalized.length ? normalized : undefined;
  })
  .optional();

export const addressInputSchema = z.object({
  fullName: fullNameSchema,
  phone: z
    .string({
      message: 'Nomor telepon wajib diisi',
    })
    .trim()
    .min(6, 'Nomor telepon terlalu pendek')
    .max(20, 'Nomor telepon terlalu panjang')
    .regex(phoneRegex, 'Nomor telepon tidak valid')
    .transform(normalizeWhitespace),
  line1: lineSchema,
  line2: optionalLineSchema,
  city: citySchema,
  province: provinceSchema,
  postalCode: z
    .string({
      message: 'Kode pos wajib diisi',
    })
    .trim()
    .regex(postalCodeRegex, 'Kode pos tidak valid')
    .transform((value) => value.replace(/\s+/g, '').toUpperCase()),
  country: countrySchema.transform((value) => normalizeWhitespace(value).toUpperCase()),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressUpdateInputSchema = addressInputSchema
  .partial()
  .extend({
    isDefault: z.boolean().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Minimal satu field perlu diubah untuk memperbarui alamat',
  );

export type AddressUpdateInput = z.infer<typeof addressUpdateInputSchema>;

export const addressSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
    isDefault: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((value) => value as Address);

export const addressListSchema = z.array(addressSchema);
