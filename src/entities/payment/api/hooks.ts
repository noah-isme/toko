import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { fetchWithCreds, type ApiError } from '@/entities/checkout/api/client';
import {
  PaymentCreateBodySchema,
  PaymentIntentSchema,
  PaymentStatusSchema,
  type PaymentCreateBody,
  type PaymentIntent,
  type PaymentStatus,
} from '@/entities/payment/schemas';
import { queryKeys } from '@/lib/api/queryKeys';

const paymentStatusInputSchema = z.string().min(1, 'Order id is required');

export function useCreatePaymentIntentMutation() {
  return useMutation<PaymentIntent, ApiError, PaymentCreateBody>({
    mutationFn: async (input) => {
      const payload = PaymentCreateBodySchema.parse(input);
      return fetchWithCreds('/payments/intent', {
        method: 'POST',
        body: payload,
        schema: PaymentIntentSchema,
      });
    },
  });
}

type PaymentStatusQueryOptions = {
  enabled?: boolean;
};

export function usePaymentStatusQuery(orderId: string, options: PaymentStatusQueryOptions = {}) {
  const enabled = options.enabled ?? Boolean(orderId);

  return useQuery<PaymentStatus, ApiError>({
    queryKey: queryKeys.paymentStatus(orderId),
    enabled,
    refetchInterval: 4000,
    queryFn: async () => {
      const validatedOrderId = paymentStatusInputSchema.parse(orderId);
      const searchParams = new URLSearchParams({ orderId: validatedOrderId });
      return fetchWithCreds(`/payments/status?${searchParams.toString()}`, {
        schema: PaymentStatusSchema,
      });
    },
  });
}
