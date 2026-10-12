import { z } from 'zod';

import type { Address } from './types';

/**
 * Keys under `checkout.address.validation` in the message catalogs. The schemas carry these keys
 * as their error messages; `AddressForm` translates them for display.
 */
export const ADDRESS_VALIDATION_KEYS = [
  'receiverNameRequired',
  'receiverNameTooLong',
  'addressLine1Required',
  'addressLine1TooLong',
  'addressLine2TooLong',
  'cityRequired',
  'cityTooLong',
  'provinceRequired',
  'provinceTooLong',
  'countryRequired',
  'countryTooLong',
  'phoneRequired',
  'phoneTooShort',
  'phoneTooLong',
  'phoneInvalid',
  'postalCodeRequired',
  'postalCodeInvalid',
  'updateEmpty',
] as const;

export type AddressValidationKey = (typeof ADDRESS_VALIDATION_KEYS)[number];

export function isAddressValidationKey(value: unknown): value is AddressValidationKey {
  return (ADDRESS_VALIDATION_KEYS as readonly unknown[]).includes(value);
}

const addressMessage = (key: AddressValidationKey) => key;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const requiredText = (
  messages: { required: AddressValidationKey; tooLong: AddressValidationKey },
  max = 120,
) =>
  z
    .string({
      message: addressMessage(messages.required),
    })
    .trim()
    .min(1, addressMessage(messages.required))
    .max(max, addressMessage(messages.tooLong))
    .transform(normalizeWhitespace);

const phoneRegex = /^[+\d().\-\s]{6,20}$/;
const postalCodeRegex = /^[A-Za-z0-9\-\s]{3,12}$/;

const receiverNameSchema = requiredText(
  { required: 'receiverNameRequired', tooLong: 'receiverNameTooLong' },
  120,
);
const addressLineSchema = requiredText(
  { required: 'addressLine1Required', tooLong: 'addressLine1TooLong' },
  160,
);
const citySchema = requiredText({ required: 'cityRequired', tooLong: 'cityTooLong' }, 80);
const provinceSchema = requiredText(
  { required: 'provinceRequired', tooLong: 'provinceTooLong' },
  80,
);
const countrySchema = requiredText({ required: 'countryRequired', tooLong: 'countryTooLong' }, 80);

const optionalAddressLineSchema = z
  .string()
  .trim()
  .max(160, addressMessage('addressLine2TooLong'))
  .transform((value) => {
    const normalized = normalizeWhitespace(value);
    return normalized.length ? normalized : undefined;
  })
  .optional();

export const addressInputSchema = z.object({
  receiverName: receiverNameSchema,
  phone: z
    .string({
      message: addressMessage('phoneRequired'),
    })
    .trim()
    .min(6, addressMessage('phoneTooShort'))
    .max(20, addressMessage('phoneTooLong'))
    .regex(phoneRegex, addressMessage('phoneInvalid'))
    .transform(normalizeWhitespace),
  addressLine1: addressLineSchema,
  addressLine2: optionalAddressLineSchema,
  city: citySchema,
  province: provinceSchema,
  postalCode: z
    .string({
      message: addressMessage('postalCodeRequired'),
    })
    .trim()
    .regex(postalCodeRegex, addressMessage('postalCodeInvalid'))
    .transform((value) => value.replace(/\s+/g, '').toUpperCase()),
  country: countrySchema.transform((value) => normalizeWhitespace(value).toUpperCase()),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressUpdateInputSchema = addressInputSchema
  .partial()
  .extend({
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, addressMessage('updateEmpty'));

export type AddressUpdateInput = z.infer<typeof addressUpdateInputSchema>;

export const addressSchema = z
  .object({
    id: z.string(),
    receiverName: z.string(),
    phone: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
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
