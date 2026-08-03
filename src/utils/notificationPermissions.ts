/**
 * notificationPermissions.ts
 * Centralized notification permission management.
 * Provides a single entry point for requesting permission,
 * avoiding duplicate prompts scattered across components.
 */

const PERMISSION_REQUESTED_KEY = 'notif_permission_requested';

export const notificationPermissions = {
  /**
   * Returns true if Notification API is available in this browser.
   */
  isSupported(): boolean {
    return 'Notification' in window;
  },

  /**
   * Returns true if Web Push is supported (for showing/hiding "Enable Push" button).
   */
  isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  /**
   * Returns the current permission state without triggering a browser prompt.
   */
  getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Requests notification permission exactly once per session.
   * Subsequent calls are no-ops if permission was already resolved.
   * Call this on an explicit user action, not on mount.
   */
  async requestOnce(): Promise<boolean> {
    if (!this.isSupported()) return false;

    // Already resolved — don't prompt again
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    // Mark that we've attempted so we don't repeat
    const alreadyAsked = sessionStorage.getItem(PERMISSION_REQUESTED_KEY);
    if (alreadyAsked === 'true') {
      // Permission is still 'default' (user dismissed without deciding)
      return false;
    }

    sessionStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  /**
   * Resets the session marker — useful after logout.
   */
  reset() {
    sessionStorage.removeItem(PERMISSION_REQUESTED_KEY);
  }
};
