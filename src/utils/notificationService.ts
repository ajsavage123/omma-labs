
export const notificationService = {
  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  async showNotification(title: string, options?: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Only show if the page is not in focus (to avoid spamming)
    if (document.visibilityState === 'visible' && !options?.requireInteraction) {
        // Optional: still show toast?
        return;
    }

    return new Notification(title, {
      icon: '/icons/icon-192x192.png', // Assuming this exists
      badge: '/icons/icon-72x72.png',
      ...options
    });
  }
};
