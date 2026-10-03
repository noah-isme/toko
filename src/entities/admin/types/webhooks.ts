/** Webhook endpoint and delivery DTOs. */

/**
 * Webhook rows come straight from sqlc, so their JSON keys are snake_case
 * unlike the hand-written admin DTOs.
 */
export interface AdminWebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  active: boolean;
  topics: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminWebhookEndpointInput {
  name: string;
  url: string;
  secret: string;
  active?: boolean;
  topics: string[];
}

export interface AdminWebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  status: string;
  attempt: number;
  max_attempt: number;
  next_attempt_at?: string | null;
  last_error?: string | null;
  response_status?: number | null;
  response_body?: string | null;
  created_at: string;
  updated_at: string;
}
