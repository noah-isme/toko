import { apiClient } from '../apiClient';

export interface NewsletterSubscribeRequest {
  email: string;
}

export interface NewsletterSubscribeResponse {
  data: {
    message: string;
    email: string;
    status: string;
  };
}

export const newsletterApi = {
  /**
   * Subscribe an email address to the newsletter
   */
  async subscribe(email: string): Promise<NewsletterSubscribeResponse['data']> {
    const response = await apiClient<NewsletterSubscribeResponse>('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.data;
  },
};
