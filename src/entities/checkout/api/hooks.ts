import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { fetchWithCreds, type ApiError } from './client';

import { AddressSchema, OrderDraftSchema, ShippingOptionSchema } from '@/entities/checkout/schemas';
import type { Address, OrderDraft, ShippingOption } from '@/entities/checkout/schemas';
import { queryKeys } from '@/lib/api/queryKeys';
import { normalizeError } from '@/shared/lib/normalizeError';
import { useToast } from '@/shared/ui/toast';

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

const checkoutDraftStateKey = ['checkout', 'draft'] as const;

type DraftCacheState =
  | { status: 'idle'; data?: OrderDraft | null }
  | { status: 'drafting'; variables: CreateOrderDraftInput };

type DraftMutationContext = {
  previousState?: DraftCacheState;
  toastId?: string;
};

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
  const { toast: pushToast, dismiss } = useToast();

  return useMutation<OrderDraft, ApiError, CreateOrderDraftInput, DraftMutationContext>({
    mutationFn: async (input) => {
      const payload = orderDraftInputSchema.parse(input);
      return fetchWithCreds('/checkout/draft', {
        method: 'POST',
        body: payload,
        schema: OrderDraftSchema,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: checkoutDraftStateKey });
      const previousState = queryClient.getQueryData<DraftCacheState>(checkoutDraftStateKey);

      const toastId = pushToast({
        id: 'checkout-draft-progress',
        title: 'Membuat draft pesanan…',
        description: 'Kami sedang menyiapkan rincian pesanan Anda.',
        duration: Infinity,
      });

      queryClient.setQueryData<DraftCacheState>(checkoutDraftStateKey, {
        status: 'drafting',
        variables,
      });

      return { previousState, toastId } satisfies DraftMutationContext;
    },
    onSuccess: (draft, _variables, context) => {
      if (context?.toastId) {
        dismiss(context.toastId);
      }

      pushToast({
        id: 'checkout-draft-success',
        title: 'Draft pesanan berhasil dibuat',
        variant: 'success',
      });

      queryClient.setQueryData<DraftCacheState>(checkoutDraftStateKey, {
        status: 'idle',
        data: draft,
      });

      if (draft.cartId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      }
    },
    onError: (error, _variables, context) => {
      if (context?.toastId) {
        dismiss(context.toastId);
      }

      if (context?.previousState) {
        queryClient.setQueryData(checkoutDraftStateKey, context.previousState);
      } else {
        queryClient.removeQueries({ queryKey: checkoutDraftStateKey, exact: true });
      }

      pushToast({
        id: 'checkout-draft-error',
        title: 'Gagal membuat draft pesanan',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: checkoutDraftStateKey });
    },
  });
}

export type { Address, ShippingOption, OrderDraft };
