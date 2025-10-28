import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { fetchWithCreds, type ApiError } from './client';

import { AddressSchema, OrderDraftSchema, ShippingOptionSchema } from '@/entities/checkout/schemas';
import type { Address, OrderDraft, ShippingOption } from '@/entities/checkout/schemas';
import { queryKeys } from '@/lib/api/queryKeys';

const shippingQuoteInputSchema = z.object({
  cartId: z.string().min(1, 'Cart id is required'),
  address: AddressSchema,
});

const orderDraftInputSchema = z.object({
  cartId: z.string().min(1, 'Cart id is required'),
  address: AddressSchema,
  shippingOptionId: z.string().min(1, 'Shipping option id is required'),
  notes: z.string().optional(),
});

const shippingOptionsResponseSchema = z.array(ShippingOptionSchema);

type ShippingQuoteInput = z.infer<typeof shippingQuoteInputSchema>;
type CreateOrderDraftInput = z.infer<typeof orderDraftInputSchema>;

export const cartQueryKey = queryKeys.cart;

export function useShippingQuoteMutation() {
  return useMutation<ShippingOption[], ApiError, ShippingQuoteInput>({
    mutationFn: async (input) => {
      const payload = shippingQuoteInputSchema.parse(input);
      return fetchWithCreds('/checkout/quote', {
        method: 'POST',
        body: payload,
        schema: shippingOptionsResponseSchema,
      });
    },
  });
}

export function useCreateOrderDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation<OrderDraft, ApiError, CreateOrderDraftInput>({
    mutationFn: async (input) => {
      const payload = orderDraftInputSchema.parse(input);
      return fetchWithCreds('/checkout/draft', {
        method: 'POST',
        body: payload,
        schema: OrderDraftSchema,
      });
    },
    onSuccess: (draft) => {
      if (draft.cartId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      }
    },
  });
}

export type { Address, ShippingOption, OrderDraft };
