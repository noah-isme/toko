/** Queue and dead-letter DTOs. */

/** Queue kinds the API workers register. `kind` is required on queue endpoints. */
export type QueueKind = 'webhook' | 'demo';

export interface QueueStats {
  kind: string;
  ready: number;
  processing: number;
  dlq: number;
  oldest_lag_ms: number;
  visibility_timeout: number;
}

export interface DeadLetterMessage {
  kind?: string;
  payload?: unknown;
  attempt?: number;
  [key: string]: unknown;
}

export interface DeadLetterEntry {
  id: string;
  kind: string;
  idempotencyKey: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
  message: DeadLetterMessage;
}

export interface DeadLetterReplayResult {
  replayed: string[];
  failed: Record<string, string>;
  kind?: string;
}
