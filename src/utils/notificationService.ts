
import { notificationPermissions } from '@/utils/notificationPermissions';
import { errorLogger } from '@/services/errorLogger';

export const notificationService = {
  /**
   * @deprecated Use notificationPermissions.requestOnce() for user-triggered flows.
   * Kept for internal usage in showNotification() fallback.
   */
  async requestPermission(): Promise<boolean> {
    return notificationPermissions.requestOnce();
  },

  playSynthesizedChime(type: 'notification' | 'success' | 'alert' = 'notification') {
    try {
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
        return; // Prevent autoplay violation warnings
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const freqs = type === 'success'
        ? [523.25, 659.25, 783.99] // C5, E5, G5 chord
        : type === 'alert'
        ? [880, 440, 880]           // Alarm ping
        : [587.33, 880];            // D5, A5 notification chime

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
      });
    } catch (e) {
      errorLogger.warn('notificationService', 'Synthesized audio failed', e);
    }
  },

  /**
   * Plays the synthesized Web Audio chime.
   * External MP3 fetching has been intentionally removed — it caused
   * redundant network requests and failed on restrictive CSP / offline environments.
   * The Web Audio chime is reliable cross-browser without any network dependency.
   */
  playSound(type: 'notification' | 'success' | 'alert' = 'notification') {
    const isMuted = localStorage.getItem('crm_notifications_muted') === 'true';
    if (isMuted) return;

    // Web Audio synthesized chime — no network dependency, no CSP issues
    this.playSynthesizedChime(type);
  },

  async showNotification(title: string, options?: NotificationOptions & { silent?: boolean }) {
    if (!notificationPermissions.isSupported()) return;

    if (Notification.permission === 'default') {
      const granted = await this.requestPermission();
      if (!granted) return;
    } else if (Notification.permission !== 'granted') {
      return;
    }

    if (!options?.silent) {
      this.playSound();
    }

    const notificationPayload: any = {
      icon: '/pwa-192x192.png',
      badge: '/ooma-badge.svg',
      vibrate: [200, 100, 200],
      ...options
    };

    // 1. Try Service Worker showNotification (required for Chrome Android / Mobile PWA)
    if ('serviceWorker' in navigator) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<any>(resolve => setTimeout(() => resolve(null), 500))
          ]);
        }

        if (registration && registration.showNotification) {
          await registration.showNotification(title, notificationPayload);
          return;
        }
      } catch (e) {
        errorLogger.warn('notificationService', 'SW showNotification failed, using fallback', e);
      }
    }

    // 2. Native Notification API fallback (Desktop Chrome/Firefox/Edge)
    try {
      const notification = new Notification(title, notificationPayload);
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
      return notification;
    } catch (e) {
      errorLogger.warn('notificationService', 'Native Notification constructor failed', e);
    }
  }
};
