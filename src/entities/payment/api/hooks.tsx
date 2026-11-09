import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { fetchWithCreds, type ApiError } from '@/entities/checkout/api/client';
import {
  getPaymentPollInterval,
  isTerminalPaymentStatus,
  PAYMENT_POLL_SCHEDULE,
} from '@/entities/payment/polling';
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

const PaymentIntentResponseSchema = z.object({
  data: PaymentIntentSchema,
});

const PaymentStatusResponseSchema = z.object({
  data: PaymentStatusSchema,
});

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
  const t = useTranslations('checkout.paymentToast');
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
      const response = await fetchWithCreds('/payments/intent', {
        method: 'POST',
        body: payload,
        schema: PaymentIntentResponseSchema,
      });
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: paymentIntentStateKey });
      const previousState =
        queryClient.getQueryData<PaymentIntentCacheState>(paymentIntentStateKey);

      const toastId = pushToast({
        id: `payment-intent-progress-${variables.orderId}`,
        eventKey: `payment-intent-progress-${variables.orderId}`,
        title: t('progress'),
        description: t('progressDescription'),
        duration: Infinity,
      });

      queryClient.setQueryData<PaymentIntentCacheState>(paymentIntentStateKey, {
        status: 'processing',
        variables,
      });

      return { previousState, toastId } satisfies PaymentIntentMutationContext;
    },
    onSuccess: (data, variables, context) => {
      if (context?.toastId) {
        dismiss(context.toastId);
      }

      queryClient.setQueryData<PaymentIntentCacheState>(paymentIntentStateKey, {
        status: 'idle',
        data,
      });

      pushToast({
        id: `payment-intent-success-${variables.orderId}`,
        eventKey: `payment-intent-success-${variables.orderId}`,
        title: t('ready'),
        description: t('readyDescription'),
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
        title: t('error'),
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

/**
 * Polls the payment status of an order. Polling backs off over time (see
 * `getPaymentPollInterval`), pauses in background tabs, stops on a terminal status, and gives up
 * after `PAYMENT_POLL_SCHEDULE.maxDurationMs` (`timedOut`). Elapsed time is counted from mount or
 * the last `restart()`; mount the consumer when polling should begin.
 */
export function usePaymentStatusQuery(orderId: string, options: PaymentStatusQueryOptions = {}) {
  const enabled = options.enabled ?? Boolean(orderId);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const query = useQuery<PaymentStatus, ApiError>({
    queryKey: queryKeys.paymentStatus(orderId),
    enabled,
    refetchInterval: (current) =>
      timedOut ? false : getPaymentPollInterval(current.state.data?.status, Date.now() - startedAt),
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const validatedOrderId = paymentStatusInputSchema.parse(orderId);
      const response = await fetchWithCreds(
        `/payments/${encodeURIComponent(validatedOrderId)}/status`,
        {
          schema: PaymentStatusResponseSchema,
        },
      );
      return response.data;
    },
  });

  const status = query.data?.status;
  const isTerminal = isTerminalPaymentStatus(status);

  useEffect(() => {
    if (!enabled || timedOut || isTerminal) {
      return;
    }
    const remaining = Math.max(0, startedAt + PAYMENT_POLL_SCHEDULE.maxDurationMs - Date.now());
    const timer = window.setTimeout(() => setTimedOut(true), remaining);
    return () => window.clearTimeout(timer);
  }, [enabled, isTerminal, startedAt, timedOut]);

  const { refetch } = query;
  const restart = useCallback(() => {
    setStartedAt(Date.now());
    setTimedOut(false);
    return refetch();
  }, [refetch]);

  return { ...query, timedOut: timedOut && !isTerminal, restart };
}
