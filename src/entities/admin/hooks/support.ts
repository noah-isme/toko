import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminOperationsApi } from '../api';
import { adminKeys } from '../keys';
import type { TicketStatus } from '../types';

import { ADMIN_STALE_TIME as STALE_TIME } from './shared';

export function useAdminTickets() {
  return useQuery({
    queryKey: adminKeys.tickets(),
    queryFn: () => adminOperationsApi.listTickets(),
    staleTime: STALE_TIME,
  });
}

export function useAdminTicketMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: adminKeys.ticketMessages(ticketId ?? ''),
    queryFn: () => adminOperationsApi.listTicketMessages(ticketId as string),
    enabled: Boolean(ticketId),
    staleTime: STALE_TIME,
  });
}

export function useUpdateAdminTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      adminOperationsApi.updateTicket(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.tickets(), exact: true });
    },
  });
}

export function useSendAdminTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      adminOperationsApi.sendTicketMessage(id, message),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ticketMessages(id) });
      void queryClient.invalidateQueries({ queryKey: adminKeys.tickets(), exact: true });
    },
  });
}
