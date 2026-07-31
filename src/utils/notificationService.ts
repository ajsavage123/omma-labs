
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

  playSynthesizedChime(type: 'notification' | 'success' | 'alert' = 'notification') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const freqs = type === 'success' 
        ? [523.25, 659.25, 783.99] // C5, E5, G5 chord
        : type === 'alert'
        ? [880, 440, 880] // Alarm ping
        : [587.33, 880]; // D5, A5 notification

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
      console.log('Synthesized audio failed:', e);
    }
  },

  playSound(type: 'notification' | 'success' | 'alert' = 'notification') {
    const isMuted = localStorage.getItem('crm_notifications_muted') === 'true';
    if (isMuted) return;

    // Always trigger synthesized Web Audio chime for guaranteed sound output
    this.playSynthesizedChime(type);

    const sounds = {
      notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
      success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      alert: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
    };
    
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch {
      // ignore fallback error
    }
  },

  async showNotification(title: string, options?: NotificationOptions & { silent?: boolean }) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const granted = await this.requestPermission();
      if (!granted) return;
    } else if (Notification.permission !== 'granted') {
      return;
    }

    // Format the title to start with oomaworkspace-CRM to avoid duplicate app name wrapping
    let formattedTitle = title;
    if (!title.startsWith('oomaworkspace-CRM')) {
      formattedTitle = `oomaworkspace-CRM - ${title}`;
    }

    if (!options?.silent) {
      this.playSound();
    }

    // Try using ServiceWorker first for better mobile support (iOS/Android PWA)
    // Race SW ready promise with a 300ms timeout to prevent hanging when SW is not active (like in dev mode)
    if ('serviceWorker' in navigator) {
      try {
        const swReady = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 300))
        ]);

        if (swReady && swReady.showNotification) {
          await swReady.showNotification(formattedTitle, {
            icon: '/pwa-192x192.png',
            badge: '/ooma-badge.svg',
            ...options
          });
          return;
        }
      } catch (e) {
        console.log('SW notification failed, falling back to basic Notification API', e);
      }
    }
    
    try {
      const notification = new Notification(formattedTitle, {
        icon: '/pwa-192x192.png',
        badge: '/ooma-badge.svg',
        ...options
      });

      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
      return notification;
    } catch (e) {
      console.log('Native Notification constructor failed:', e);
    }
  }
};
