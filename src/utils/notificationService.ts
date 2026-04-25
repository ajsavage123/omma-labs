
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

  playSound(type: 'notification' | 'success' | 'alert' = 'notification') {
    const sounds = {
      notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      alert: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
    };
    
    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
  },

  async showNotification(title: string, options?: NotificationOptions & { silent?: boolean }) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    if (!options?.silent) {
      this.playSound();
    }

    // Only show if the page is not in focus (to avoid spamming)
    // Removed visibility check as per user request to always show "pop and sound"
    
    // Try using ServiceWorker first for better mobile support (iOS/Android PWA)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            ...options
          });
          return;
        }
      } catch (e) {
        console.log('SW notification failed, falling back to basic Notification API', e);
      }
    }
    
    return new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    });
  }
};
