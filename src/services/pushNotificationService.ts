import { supabase } from '@/lib/supabase';
import { errorLogger } from '@/services/errorLogger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Base64 URL-safe string to a Uint8Array required by PushManager.
 * An uncompressed P-256 public key must be exactly 65 bytes.
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Validates that a VAPID public key is a Base64-URL string that decodes to
 * exactly 65 bytes (uncompressed P-256 point: 0x04 || x || y).
 */
const validateVapidKey = (key: string | undefined): key is string => {
  if (!key || key.trim().length === 0) {
    errorLogger.error('pushNotificationService', 'VITE_VAPID_PUBLIC_KEY is missing. Push notifications will not work.');
    return false;
  }
  try {
    const decoded = urlBase64ToUint8Array(key);
    if (decoded.length !== 65) {
      errorLogger.error('pushNotificationService', `Invalid VAPID key length: expected 65 bytes, got ${decoded.length}.`);
      return false;
    }
    return true;
  } catch {
    errorLogger.error('pushNotificationService', 'VITE_VAPID_PUBLIC_KEY is not a valid Base64-URL string.');
    return false;
  }
};

/** Basic URL validation — prevents malformed endpoints being saved to DB. */
const isValidHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const pushNotificationService = {
  /**
   * Returns true if this browser supports Web Push.
   * Use to show/hide "Enable Push" UI.
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  /**
   * Validates the VAPID key on app start.
   * Call once during initialization to surface missing-key errors early.
   */
  validateEnvironment(): boolean {
    return validateVapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY);
  },

  /**
   * Request permission and subscribe to Web Push Notifications.
   */
  async subscribeToPushNotifications() {
    if (!this.isSupported()) {
      errorLogger.warn('pushNotificationService', 'Push notifications are not supported by this browser.');
      return false;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        errorLogger.warn('pushNotificationService', 'Notification permission not granted.');
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Validate VAPID key before using it
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!validateVapidKey(vapidPublicKey)) return false;

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const subscriptionData = JSON.parse(JSON.stringify(subscription));

      // Validate endpoint URL before saving to DB
      if (!isValidHttpsUrl(subscriptionData.endpoint)) {
        errorLogger.error('pushNotificationService', 'Invalid push subscription endpoint URL — not saving to DB.', subscriptionData.endpoint);
        return false;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Save to Supabase — unique index on (user_id, endpoint) prevents duplicates
      const { error } = await supabase
        .from('user_push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint: subscriptionData.endpoint,
            p256dh_key: subscriptionData.keys.p256dh,
            auth_key: subscriptionData.keys.auth
          },
          { onConflict: 'endpoint' }
        );

      if (error) {
        errorLogger.error('pushNotificationService', 'Failed to save push subscription to Supabase.', error);
        return false;
      }

      errorLogger.info('pushNotificationService', 'Successfully subscribed to Push Notifications.');
      return true;
    } catch (error) {
      errorLogger.error('pushNotificationService', 'Error subscribing to push notifications.', error);
      return false;
    }
  },

  /**
   * Unsubscribe from Web Push Notifications.
   */
  async unsubscribeFromPushNotifications() {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        // Remove from DB first
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);

        // Then unsubscribe from browser
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      errorLogger.error('pushNotificationService', 'Error unsubscribing from push notifications.', error);
      return false;
    }
  }
};
