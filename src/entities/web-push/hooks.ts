import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { webPushApi } from './api';
import type { PushPreferences, PushSubscriptionInput } from './types';

import { normalizeError } from '@/shared/lib/normalizeError';
import { capturePosthogEvent } from '@/shared/telemetry/posthog';
import { captureSentryException } from '@/shared/telemetry/sentry';
import { useToast } from '@/shared/ui/toast';

export const webPushKeys = {
  all: ['web-push'] as const,
  vapidKey: () => [...webPushKeys.all, 'vapid-key'] as const,
  preferences: () => [...webPushKeys.all, 'preferences'] as const,
  subscription: () => [...webPushKeys.all, 'subscription'] as const,
};

export function useVapidPublicKeyQuery() {
  return useQuery({
    queryKey: webPushKeys.vapidKey(),
    queryFn: webPushApi.getVapidPublicKey,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function usePushPreferencesQuery() {
  return useQuery({
    queryKey: webPushKeys.preferences(),
    queryFn: webPushApi.getPreferences,
  });
}

export function useSubscribePushMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: webPushApi.subscribe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: webPushKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: webPushKeys.subscription() });

      capturePosthogEvent('push_subscribe', {
        success: true,
      });

      toast({
        id: 'push-subscribe-success',
        title: 'Notifikasi push diaktifkan',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      captureSentryException(error, {
        tags: { feature: 'web-push', action: 'subscribe' },
      });

      toast({
        id: 'push-subscribe-error',
        title: 'Gagal mengaktifkan notifikasi push',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUnsubscribePushMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (endpoint?: string) => webPushApi.unsubscribe(endpoint),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: webPushKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: webPushKeys.subscription() });

      capturePosthogEvent('push_unsubscribe', {
        success: true,
      });

      toast({
        id: 'push-unsubscribe-success',
        title: 'Notifikasi push dinonaktifkan',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      captureSentryException(error, {
        tags: { feature: 'web-push', action: 'unsubscribe' },
      });

      toast({
        id: 'push-unsubscribe-error',
        title: 'Gagal menonaktifkan notifikasi push',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePushPreferencesMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (preferences: Partial<PushPreferences>) => webPushApi.updatePreferences(preferences),
    onMutate: async (newPreferences) => {
      await queryClient.cancelQueries({ queryKey: webPushKeys.preferences() });

      const previousPreferences = queryClient.getQueryData<PushPreferences>(webPushKeys.preferences());

      if (previousPreferences) {
        queryClient.setQueryData(webPushKeys.preferences(), {
          ...previousPreferences,
          ...newPreferences,
        });
      }

      return { previousPreferences };
    },
    onSuccess: (data, variables) => {
      capturePosthogEvent('push_preferences_update', {
        preferences: variables,
        success: true,
      });

      toast({
        id: 'push-preferences-success',
        title: 'Preferensi notifikasi diperbarui',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(webPushKeys.preferences(), context.previousPreferences);
      }

      captureSentryException(error, {
        tags: { feature: 'web-push', action: 'update_preferences' },
      });

      toast({
        id: 'push-preferences-error',
        title: 'Gagal memperbarui preferensi',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webPushKeys.preferences() });
    },
  });
}

export function useSendTestPushMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: webPushApi.sendTestNotification,
    onSuccess: (data) => {
      toast({
        id: 'push-test-success',
        title: 'Notifikasi tes dikirim',
        description: data.message,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        id: 'push-test-error',
        title: 'Gagal mengirim notifikasi tes',
        description: normalizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function usePushNotificationPermission() {
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    return await Notification.requestPermission();
  }, []);

  const getPermission = useCallback((): NotificationPermission => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }, []);

  return { requestPermission, getPermission };
}

export function usePushSubscription() {
  const { requestPermission } = usePushNotificationPermission();
  const subscribeMutation = useSubscribePushMutation();
  const unsubscribeMutation = useUnsubscribePushMutation();
  const vapidKeyQuery = useVapidPublicKeyQuery();

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported in this browser');
    }

    const permission = await requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidKey = vapidKeyQuery.data;
      if (!vapidKey) {
        throw new Error('VAPID key not available');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const sub = subscription.toJSON();
    const pushSubscription: PushSubscriptionInput = {
      subscription: {
        endpoint: sub.endpoint!,
        keys: {
          p256dh: base64urlToBase64(sub.keys!.p256dh),
          auth: base64urlToBase64(sub.keys!.auth),
        },
      },
      userAgent: navigator.userAgent,
    };

    await subscribeMutation.mutateAsync(pushSubscription);
  }, [requestPermission, vapidKeyQuery.data, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await unsubscribeMutation.mutateAsync(subscription.endpoint);
    }
  }, [unsubscribeMutation]);

  return {
    subscribe,
    unsubscribe,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    subscribeError: subscribeMutation.error,
    unsubscribeError: unsubscribeMutation.error,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function base64urlToBase64(base64url: string): string {
  // subscription.toJSON() returns keys as base64url strings
  // We need to convert to standard base64 for the backend
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}