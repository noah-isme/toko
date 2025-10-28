import { z } from 'zod';

import { priceSchema } from '@/lib/api/schemas';

export const OrderListItemSchema = z.object({
  id: z.string(),
  number: z.string(),
  createdAt: z.string(),
  total: priceSchema,
  paymentStatus: z.string(),
  fulfillmentStatus: z.string(),
});

export const OrderAddressSchema = z.object({
  fullName: z.string(),
  phone: z.string().optional(),
  detail: z.string(),
  district: z.string().optional(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
  country: z.string().optional(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: priceSchema,
  total: priceSchema,
  imageUrl: z.string().url().nullish(),
  variant: z.string().nullish(),
});

export const OrderTotalsSchema = z.object({
  subtotal: priceSchema,
  shipping: priceSchema.nullish(),
  discount: priceSchema.nullish(),
  tax: priceSchema.nullish(),
  total: priceSchema,
});

export const OrderStatusHistorySchema = z.object({
  status: z.string(),
  label: z.string().optional(),
  at: z.string(),
});

export const OrderDetailSchema = z.object({
  id: z.string(),
  number: z.string(),
  createdAt: z.string(),
  paymentStatus: z.string(),
  fulfillmentStatus: z.string(),
  items: z.array(OrderItemSchema),
  totals: OrderTotalsSchema,
  shippingAddress: OrderAddressSchema.nullish(),
  billingAddress: OrderAddressSchema.nullish(),
  shippingMethod: z
    .object({
      id: z.string(),
      label: z.string(),
      cost: priceSchema.nullish(),
      trackingNumber: z.string().nullish(),
    })
    .nullish(),
  statusHistory: z.array(OrderStatusHistorySchema).nullish(),
  notes: z.string().nullish(),
});

export type OrderListItem = z.infer<typeof OrderListItemSchema>;
export type OrderAddress = z.infer<typeof OrderAddressSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderTotals = z.infer<typeof OrderTotalsSchema>;
export type OrderStatusHistory = z.infer<typeof OrderStatusHistorySchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
