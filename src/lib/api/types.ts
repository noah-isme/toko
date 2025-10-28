import type {
  cartItemSchema,
  cartSchema,
  priceSchema,
  productSchema,
  productsResponseSchema,
} from "./schemas";
import { z } from "zod";

export type Product = z.infer<typeof productSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;
export type Price = z.infer<typeof priceSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type ProductsQueryParams = {
  search?: string;
};
