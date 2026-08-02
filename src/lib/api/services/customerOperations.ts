import { apiClient } from '../apiClient';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CANCELLED';
export type TicketStatus = 'OPEN' | 'PENDING_CUSTOMER' | 'PENDING_AGENT' | 'RESOLVED' | 'CLOSED';

export interface CustomerReturn {
  id: string;
  orderId: string;
  userId?: string;
  status: ReturnStatus;
  reason: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  orderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'customer' | 'agent';
  message: string;
  createdAt: string;
}

export const customerOperationsApi = {
  async listReturns(): Promise<CustomerReturn[]> {
    const response = await apiClient<{ data: CustomerReturn[] }>('/returns', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },
  async createReturn(orderId: string, reason: string, notes?: string): Promise<CustomerReturn> {
    const response = await apiClient<{ data: CustomerReturn }>(
      `/orders/${encodeURIComponent(orderId)}/returns`,
      { method: 'POST', requiresAuth: true, body: JSON.stringify({ reason, notes }) },
    );
    return response.data;
  },
  async listTickets(): Promise<SupportTicket[]> {
    const response = await apiClient<{ data: SupportTicket[] }>('/support/tickets', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },
  async listTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    const response = await apiClient<{ data: SupportMessage[] }>(
      `/support/tickets/${encodeURIComponent(ticketId)}/messages`,
      { requiresAuth: true },
    );
    return response.data ?? [];
  },
  async createTicket(subject: string, message: string, orderId?: string): Promise<SupportTicket> {
    const response = await apiClient<{ data: SupportTicket }>('/support/tickets', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ subject, message, orderId: orderId || undefined }),
    });
    return response.data;
  },
  async sendTicketMessage(ticketId: string, message: string) {
    return apiClient(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ message }),
    });
  },
};

export const adminOperationsApi = {
  async listReturns(): Promise<CustomerReturn[]> {
    const response = await apiClient<{ data: CustomerReturn[] }>('/admin/returns', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },
  async updateReturn(id: string, status: ReturnStatus) {
    const response = await apiClient<{ data: CustomerReturn }>(
      `/admin/returns/${encodeURIComponent(id)}`,
      { method: 'PATCH', requiresAuth: true, body: JSON.stringify({ status }) },
    );
    return response.data;
  },
  async refundReturn(id: string) {
    const response = await apiClient(`/admin/returns/${encodeURIComponent(id)}/refund`, {
      method: 'POST',
      requiresAuth: true,
    });
    return response;
  },
  async listTickets(): Promise<SupportTicket[]> {
    const response = await apiClient<{ data: SupportTicket[] }>('/admin/support/tickets', {
      requiresAuth: true,
    });
    return response.data ?? [];
  },
  async listTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    const response = await apiClient<{ data: SupportMessage[] }>(
      `/admin/support/tickets/${encodeURIComponent(ticketId)}/messages`,
      { requiresAuth: true },
    );
    return response.data ?? [];
  },
  async updateTicket(id: string, status: TicketStatus) {
    const response = await apiClient<{ data: SupportTicket }>(
      `/admin/support/tickets/${encodeURIComponent(id)}`,
      { method: 'PATCH', requiresAuth: true, body: JSON.stringify({ status }) },
    );
    return response.data;
  },
  async sendTicketMessage(id: string, message: string) {
    return apiClient(`/admin/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ message }),
    });
  },
};
