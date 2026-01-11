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

// Checkout Schema matching the user's new requirement
export const CheckoutSchema = z.object({
  cartId: z.string().min(1, 'Invalid Cart ID'),
  shippingAddressId: z.string().min(1, 'Please select a shipping address'),
  shippingService: z.string().min(1, 'Please select a shipping service'),
  shippingCost: z.number().min(0),
  paymentMethod: z.enum([
    'bank_transfer',
    'virtual_account',
    'credit_card',
    'ewallet_gopay',
    'ewallet_ovo',
    'ewallet_dana'
  ]),
  notes: z.string().max(500).optional(),
});

export const CheckoutResponseSchema = z.preprocess(
  (val: any) => {
    if (!val || typeof val !== 'object') return val;
    return {
      orderId: val.orderId || val.order_id || val.id,
      orderNumber: val.orderNumber || val.order_number || val.order_no || 'ORD-UNKNOWN',
      status: val.status || 'pending',
      total: typeof val.total === 'number' ? val.total :
        typeof val.total_amount === 'number' ? val.total_amount :
          typeof val.amount === 'number' ? val.amount : 0,
      paymentUrl: val.paymentUrl || val.payment_url || val.redirect_url,
      paymentExpiry: val.paymentExpiry || val.payment_expiry || val.expiry_time,
    };
  },
  z.object({
    orderId: z.string(),
    orderNumber: z.string(),
    status: z.string(),
    total: z.number(),
    paymentUrl: z.string().optional(),
    paymentExpiry: z.string().optional(),
  })
);

export type Address = z.infer<typeof AddressSchema>;
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
export type Totals = z.infer<typeof TotalsSchema>;
export type OrderDraft = z.infer<typeof OrderDraftSchema>;
export type CheckoutPayload = z.infer<typeof CheckoutSchema>;
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
