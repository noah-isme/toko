import { apiClient } from '../apiClient';

export interface PaymentInstructions {
  provider: string;
  channel: string;
  steps: string[];
  bank?: { name?: string; accountName?: string; accountNumber?: string };
  qrUrl?: string;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  filename: string;
}

export const paymentApi = {
  async getInstructions(orderId: string) {
    const response = await apiClient<{ data: PaymentInstructions }>(
      `/payments/${encodeURIComponent(orderId)}/instructions`,
      { requiresAuth: true },
    );
    return response.data;
  },
  async uploadProof(orderId: string, file: File): Promise<{ data: PaymentProof }> {
    const body = new FormData();
    body.append('proof', file);
    return apiClient<{ data: PaymentProof }>(`/payments/${encodeURIComponent(orderId)}/proof`, {
      method: 'POST',
      body,
      requiresAuth: true,
    });
  },
};
