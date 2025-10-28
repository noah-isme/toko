import { z } from "zod";

export const priceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().min(1),
});

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  price: priceSchema,
  imageUrl: z.string().url().optional(),
  rating: z.object({
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
  tags: z.array(z.string().min(1)).default([]),
  inventory: z.object({
    available: z.number().int().nonnegative(),
    isInStock: z.boolean(),
  }),
});

export const productsResponseSchema = z.object({
  data: z.array(productSchema),
});

export const cartItemSchema = z.object({
  id: z.string().min(1),
  product: productSchema,
  quantity: z.number().int().positive(),
  lineTotal: priceSchema,
});

export const cartSchema = z.object({
  id: z.string().min(1),
  items: z.array(cartItemSchema),
  subtotal: priceSchema,
  totalItems: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const healthSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});
