import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
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
import { normalizeError } from '@/shared/lib/normalizeError';
import { useToast } from '@/shared/ui/toast';
import { RetryToastAction } from '@/shared/ui/toast/RetryToastAction';

const paymentStatusInputSchema = z.string().min(1, 'Order id is required');

const paymentIntentStateKey = ['payment', 'intent'] as const;

type PaymentIntentCacheState =
  | { status: 'idle'; data?: PaymentIntent | null }
  | { status: 'processing'; variables: PaymentCreateBody };

type PaymentIntentMutationContext = {
  previousState?: PaymentIntentCacheState;
  toastId?: string;
};

type RetryHandler = ((variables: PaymentCreateBody) => void) | undefined;

export function useCreatePaymentIntentMutation() {
  const queryClient = useQueryClient();
  const { toast: pushToast, dismiss } = useToast();
  const retryHandlerRef = useRef<RetryHandler>(undefined);

  const registerRetryHandler = useCallback((handler?: (variables: PaymentCreateBody) => void) => {
    retryHandlerRef.current = handler;
  }, []);

  const mutation = useMutation<
    PaymentIntent,
    ApiError,
    PaymentCreateBody,
    PaymentIntentMutationContext
  >({
    mutationFn: async (input) => {
      const payload = PaymentCreateBodySchema.parse(input);
      return fetchWithCreds('/payments/intent', {
        method: 'POST',
        body: payload,
        schema: PaymentIntentSchema,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: paymentIntentStateKey });
      const previousState =
        queryClient.getQueryData<PaymentIntentCacheState>(paymentIntentStateKey);

      const toastId = pushToast({
        id: `payment-intent-progress-${variables.orderId}`,
        eventKey: `payment-intent-progress-${variables.orderId}`,
        title: 'Memproses pembayaran…',
        description: 'Menghubungkan ke penyedia pembayaran.',
        duration: Infinity,
      });

      queryClient.setQueryData<PaymentIntentCacheState>(paymentIntentStateKey, {
        status: 'processing',
        variables,
      });

      return { previousState, toastId } satisfies PaymentIntentMutationContext;
    },
    onSuccess: (data, _variables, context) => {
      if (context?.toastId) {
        dismiss(context.toastId);
      }

      queryClient.setQueryData<PaymentIntentCacheState>(paymentIntentStateKey, {
        status: 'idle',
        data,
      });

      pushToast({
        id: `payment-intent-success-${data.orderId}`,
        eventKey: `payment-intent-success-${data.orderId}`,
        title: 'Pembayaran siap dilanjutkan',
        description: 'Buka halaman pembayaran untuk menyelesaikan transaksi.',
        variant: 'success',
      });
    },
    onError: (error, variables, context) => {
      if (context?.toastId) {
        dismiss(context.toastId);
      }

      if (context?.previousState) {
        queryClient.setQueryData(paymentIntentStateKey, context.previousState);
      } else {
        queryClient.removeQueries({ queryKey: paymentIntentStateKey, exact: true });
      }

      pushToast({
        id: `payment-intent-error-${variables.orderId}`,
        eventKey: `payment-intent-error-${variables.orderId}`,
        title: 'Gagal membuat pembayaran',
        description: normalizeError(error),
        variant: 'destructive',
        action:
          retryHandlerRef.current && variables ? (
            <RetryToastAction
              onRetry={() => {
                retryHandlerRef.current?.(variables);
              }}
              errorEventKey={`payment-intent-retry-error-${variables.orderId}`}
            />
          ) : undefined,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: paymentIntentStateKey });
    },
  });

  return useMemo(
    () => ({
      ...mutation,
      registerRetryHandler,
    }),
    [mutation, registerRetryHandler],
  );
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
