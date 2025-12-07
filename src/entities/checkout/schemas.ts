import { z } from 'zod';

export const AddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  province: z.string().min(1, 'Province is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  detail: z.string().min(1, 'Address detail is required'),
});

export const ShippingOptionSchema = z.object({
  id: z.string().min(1, 'Shipping option id is required'),
  courier: z.string().min(1, 'Courier is required'),
  service: z.string().min(1, 'Service is required'),
  etd: z.string().min(1, 'Estimated delivery time is required'),
  cost: z.number().nonnegative(),
});

export const TotalsSchema = z.object({
  subtotal: z.number().nonnegative(),
  discount: z.number().min(0),
  tax: z.number().min(0),
  shipping: z.number().min(0),
  total: z.number().min(0),
});

export const OrderDraftSchema = z.object({
  cartId: z.string().min(1, 'Cart id is required'),
  address: AddressSchema,
  shippingOption: ShippingOptionSchema,
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  totals: TotalsSchema,
});

export type Address = z.infer<typeof AddressSchema>;
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
export type Totals = z.infer<typeof TotalsSchema>;
export type OrderDraft = z.infer<typeof OrderDraftSchema>;
