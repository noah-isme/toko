import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useCartStore } from '@/stores/cart-store';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { ApiResponse } from '@/lib/api/types';

import {
  AddressSchema,
  OrderDraftSchema,
  ShippingOptionSchema,
  CheckoutSchema,
  CheckoutResponseSchema
} from '@/entities/checkout/schemas';
import type {
  Address,
  OrderDraft,
  ShippingOption,
  CheckoutPayload,
  CheckoutResponse
} from '@/entities/checkout/schemas';
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
  paymentMethod: z.string().optional(),
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
  return useMutation<ShippingOption[], ApiClientError, ShippingQuoteInput>({
    mutationFn: async (input) => {
      const payload = shippingQuoteInputSchema.parse(input);

      // Calculate weight from cart items? Backend should handle it if passed cartId.
      // But we need to pass destination.
      // Map address to destination format expected by backend.
      // Docs say: { destination: "Jakarta Selatan", courier: "jne", weightGram: 500 }

      const apiPayload = {
        destination: payload.address.city, // Using city as destination
        courier: 'jne', // Default to JNE for now, or could iterate ['jne', 'sicepat', 'jnt']
        weightGram: 1000, // Default weight, ideally backend calculates or we fetch cart weight (omitted for now)
      };

      const response = await apiClient<ApiResponse<{ service: string; description: string; cost: number; etd: string }[]>>(
        `/carts/${payload.cartId}/quote/shipping`,
        {
          method: 'POST',
          body: JSON.stringify(apiPayload),
          requiresAuth: true,
        }
      );

      // Map backend response to client schema using canonical service code for checkout
      return response.data.map((opt: any) => {
        const rawService = opt.service || opt.code || opt.service_code || 'Standard';
        const service = String(rawService).trim() || 'Standard';
        const description = opt.description || opt.name || opt.service_name || 'Shipping Service';
        const cost = typeof opt.cost === 'number' ? opt.cost :
          typeof opt.price === 'number' ? opt.price :
            typeof opt.value === 'number' ? opt.value : 0;
        const etd = opt.etd || opt.estimated_delivery_time || opt.duration || '2-3 days';
        const serviceCode = service.toLowerCase().replace(/\s+/g, '-');
        const courier = apiPayload.courier;

        return {
          id: `${courier}-${serviceCode}`,
          courier,
          service,
          description,
          cost,
          etd,
        };
      });
    },
  });
}

export function useCreateOrderDraftMutation() {
  const queryClient = useQueryClient();
  const { toast: pushToast, dismiss } = useToast();

  return useMutation<OrderDraft, ApiClientError, CreateOrderDraftInput, DraftMutationContext>({
    mutationFn: async (input) => {
      const payload = orderDraftInputSchema.parse(input);
      const response = await apiClient<ApiResponse<OrderDraft>>('/checkout/draft', {
        method: 'POST',
        body: JSON.stringify(payload),
        requiresAuth: true,
      });
      return OrderDraftSchema.parse(response.data);
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

export type { Address, ShippingOption, OrderDraft, CheckoutPayload, CheckoutResponse };

export function useCheckoutMutation() {
  const queryClient = useQueryClient();
  const { toast: pushToast, dismiss } = useToast();

  return useMutation<CheckoutResponse, ApiClientError, CheckoutPayload>({
    mutationFn: async (input) => {
      const payload = CheckoutSchema.parse(input);
      const response = await apiClient<ApiResponse<CheckoutResponse>>('/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
        requiresAuth: true,
      });
      return CheckoutResponseSchema.parse(response.data);
    },
    onMutate: () => {
      pushToast({
        id: 'checkout-process',
        title: 'Memproses pesanan...',
        description: 'Mohon tunggu sebentar.',
        duration: Infinity,
      });
    },
    onSuccess: (data) => {
      dismiss('checkout-process');

      // Explicitly clear persistent cart state
      useCartStore.getState().clearCart();

      pushToast({
        id: 'checkout-success',
        title: 'Pesanan berhasil dibuat!',
        description: `Order ID: ${data.orderNumber}`,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    },
    onError: (error) => {
      dismiss('checkout-process');
      pushToast({
        id: 'checkout-error',
        title: 'Gagal memproses pesanan',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}
