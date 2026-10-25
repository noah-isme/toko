import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAlert, listAlerts, subscribeAlert } from './api';
import { alertsKeys } from './keys';
import type { AlertListParams, AlertSubscribeInput, AlertSubscription } from './types';

/** Upper bound of one page (backend max); a single product rarely has more than a few alerts. */
const PRODUCT_ALERTS_LIMIT = 100;
/**
 * Safety cap on pages followed by `fetchAllAlerts` (10 000 alerts). The
 * backend clamps huge page numbers to an empty page, so the loop also stops
 * on the first empty page.
 */
const MAX_ALERT_PAGES = 100;

/** Reads every page of the user's alerts, `PRODUCT_ALERTS_LIMIT` at a time. */
export async function fetchAllAlerts(): Promise<AlertSubscription[]> {
  const all: AlertSubscription[] = [];
  for (let page = 1; page <= MAX_ALERT_PAGES; page += 1) {
    const response = await listAlerts({ page, limit: PRODUCT_ALERTS_LIMIT });
    all.push(...response.data);
    if (response.data.length === 0 || all.length >= response.pagination.totalItems) break;
  }
  return all;
}

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

/**
 * Every alert of the signed-in user in one query (pages followed while
 * `totalItems` says more exist). Pages that show many products, such as
 * favorites, read alerts from this instead of one `productId` query per
 * product, which would cost one request per product against the backend's
 * per-user and global rate limits.
 */
export function useAllMyAlertsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: alertsKeys.everything(),
    queryFn: fetchAllAlerts,
    enabled: options?.enabled ?? true,
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
