import { z } from 'zod';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionData {
  subscription: PushSubscription;
  userAgent?: string;
}

export interface VapidPublicKeyResponse {
  publicKey: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
});

export const vapidPublicKeySchema = z.object({
  publicKey: z.string(),
});

export type VapidPublicKey = z.infer<typeof vapidPublicKeySchema>;

export interface PushSubscriptionInput {
  subscription: PushSubscription;
  userAgent?: string;
}

export interface PushSubscriptionResponse {
  success: boolean;
  message: string;
}

export const PUSH_NOTIFICATION_TYPES = {
  ORDER_UPDATE: 'order_update',
  PRICE_DROP: 'price_drop',
  FLASH_SALE: 'flash_sale',
  NEW_REVIEW: 'new_review',
  QA_ANSWERED: 'qa_answered',
  LOYALTY_REWARD: 'loyalty_reward',
  GENERAL: 'general',
} as const;

export type PushNotificationType = (typeof PUSH_NOTIFICATION_TYPES)[keyof typeof PUSH_NOTIFICATION_TYPES];

export interface PushPreferences {
  enabled: boolean;
  types: Record<PushNotificationType, boolean>;
  endpoint?: string;
}