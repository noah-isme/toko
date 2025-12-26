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
  name: z.string(), // Cart uses name?
  quantity: z.number().int().min(1),
  price: z.object({ amount: z.number(), currency: z.string() }), // Cart still uses structured price internally? Or backend returns structured cart?
  // User didn't verify cart payload. I will assume cart uses structured price or stick to current.
  // Actually, handlers.ts cart logic uses product.price.
  // If product.price is number now, cart logic needs update.
  // I will check handlers.ts next.
  image: z.string().url().nullable().optional(),
  maxQuantity: z.number().int().min(1).optional(),
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
export type User = z.infer<typeof userSchema>;
export type AddToCartInput = z.infer<typeof addToCartInputSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;
