import { apiClient } from '../apiClient';

export interface PrivacyPreferences {
  marketingEmails: boolean;
  orderUpdates: boolean;
  securityAlerts: boolean;
  profileVisibility: 'public' | 'friends' | 'private';
  dataProcessing: boolean;
  analyticsTracking: boolean;
}

export interface DataExport {
  profile: Record<string, unknown>;
  orders: Record<string, unknown>[];
  exportedAt: string;
}

export const privacyApi = {
  async getPreferences() {
    const response = await apiClient<{ data: PrivacyPreferences }>('/users/me/privacy', { requiresAuth: true });
    return response.data;
  },
  async updatePreferences(preferences: PrivacyPreferences) {
    const response = await apiClient<{ data: PrivacyPreferences }>('/users/me/privacy', { method: 'PUT', requiresAuth: true, body: JSON.stringify(preferences) });
    return response.data;
  },
  async exportData() {
    const response = await apiClient<{ data: DataExport }>('/users/me/data-export', { requiresAuth: true });
    return response.data;
  },
  async deleteAccount() {
    await apiClient('/users/me', { method: 'DELETE', requiresAuth: true });
  },
};
