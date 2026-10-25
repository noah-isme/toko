import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAlert, listAlerts, subscribeAlert } from './api';
import { alertsKeys } from './keys';
import type { AlertListParams, AlertSubscribeInput } from './types';

/** Upper bound of one page; a single product rarely has more than a few alerts. */
const PRODUCT_ALERTS_LIMIT = 100;

/** The signed-in user's alerts, newest first ("My alerts"). */
export function useMyAlertsQuery(params: AlertListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertsKeys.list(params),
    queryFn: () => listAlerts(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** All of the user's alerts on one product (server-side `productId` filter). */
export function useProductAlertsQuery(productId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertsKeys.product(productId),
    queryFn: async () => (await listAlerts({ productId, limit: PRODUCT_ALERTS_LIMIT })).data,
    enabled: Boolean(productId) && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

export function useSubscribeAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AlertSubscribeInput) => subscribeAlert(input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: alertsKeys.all }),
  });
}

export function useDeleteAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: alertsKeys.all }),
  });
}
