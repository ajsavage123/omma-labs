import { supabase } from '@/lib/supabase';

// Utility to convert Base64 URL-safe string to Uint8Array required by pushManager
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const pushNotificationService = {
  /**
   * Request permission and subscribe to Web Push Notifications
   */
  async subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported by this browser.');
      return false;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted.');
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from env
      // You must set VITE_VAPID_PUBLIC_KEY in your .env file
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VITE_VAPID_PUBLIC_KEY is not set in environment variables.');
        return false;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Parse keys to send to backend
      const subscriptionData = JSON.parse(JSON.stringify(subscription));
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Save to Supabase
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
        console.error('Error saving push subscription to Supabase:', error);
        return false;
      }

      console.log('Successfully subscribed to Push Notifications!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  },

  /**
   * Unsubscribe from Web Push Notifications
   */
  async unsubscribeFromPushNotifications() {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from DB first
        const endpoint = subscription.endpoint;
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
      console.error('Error unsubscribing:', error);
      return false;
    }
  }
};
