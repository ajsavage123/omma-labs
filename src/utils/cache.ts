type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const STORAGE_PREFIX = 'supa_cache_';

/**
 * LocalStorage-based cache with TTL to survive refreshes and multiple tabs.
 */
export const queryCache = {
  get<T>(key: string, ttlMs: number = 60000): T | null {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const isExpired = Date.now() - entry.timestamp > ttlMs;

      if (isExpired) {
        localStorage.removeItem(STORAGE_PREFIX + key);
        return null;
      }

      return entry.data;
    } catch (e) {
      return null;
    }
  },

  set<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache set failed (quota?)');
    }
  },

  invalidate(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
