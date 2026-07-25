import { z } from 'zod';

export const priceSchema = z.object({
  amount: z.number(),
  currency: z.string().length(3),
});

// Product schema matching API Contract v0.2.0 (line 354-386)
export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  price: z.number(),
  originalPrice: z.number().optional(),
  discountPercent: z.number().optional(),
  currency: z.string().default('IDR'),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  imageUrl: z.string().url().optional(), // Primary image
  images: z.array(z.string().url()).optional().default([]),
  stock: z.number().int().nonnegative(),
  inStock: z.boolean().default(true),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string().optional(),
});

export const productListSchema = z.array(productSchema);

export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional().nullish(),
  title: z.string(),
  slug: z.string(),
  qty: z.number().int().min(1),
  unitPrice: z.number(),
  subtotal: z.number(),
  imageUrl: z.string().url().optional(),
});

export const cartPricingSchema = z.object({
  subtotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  shipping: z.number(),
  total: z.number(),
});

export const cartSchema = z.object({
  id: z.string(),
  anonId: z.string().optional().nullish(),
  voucher: z.string().optional().nullish(),
  items: z.array(cartItemSchema),
  pricing: cartPricingSchema,
  currency: z.string(),
});

export const cartViewItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: z.object({ amount: z.number(), currency: z.string() }),
  image: z.string().url().nullable().optional(),
  maxQuantity: z.number().int().min(0).optional(),
});

export const cartViewSchema = z.object({
  id: z.string(),
  items: z.array(cartViewItemSchema),
  subtotal: priceSchema,
  itemCount: z.number().int().nonnegative().default(0),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  emailVerified: z.boolean().optional(),
  phone: z.string().optional(),
});

// API Contract uses `qty` instead of `quantity`, and includes optional variantId
export const addToCartInputSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(), // Optional - not all products have variants
  qty: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemInputSchema = z.object({
  qty: z.number().int().min(1).max(99),
});

export type Product = z.infer<typeof productSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CartView = z.infer<typeof cartViewSchema>;
export type CartViewItem = z.infer<typeof cartViewItemSchema>;
export type User = z.infer<typeof userSchema>;
export type AddToCartInput = z.infer<typeof addToCartInputSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;
