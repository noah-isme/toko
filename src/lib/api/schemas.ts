import { z } from 'zod';

export const priceSchema = z.object({
  amount: z.number(),
  currency: z.string().length(3),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: priceSchema,
  images: z.array(z.string().url()).default([]),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  inventory: z.number().int().nonnegative().default(0),
  categories: z.array(z.string()).default([]),
});

export const productListSchema = z.array(productSchema);

export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: priceSchema,
  image: z.string().url().nullable().optional(),
});

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  subtotal: priceSchema,
  itemCount: z.number().int().nonnegative().default(0),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

export const addToCartInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type User = z.infer<typeof userSchema>;
export type AddToCartInput = z.infer<typeof addToCartInputSchema>;
