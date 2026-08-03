/**
 * errorLogger.ts
 * Centralized error reporting utility.
 * In production, errors are forwarded to Sentry (if VITE_SENTRY_DSN is set).
 * In development, errors are shown as a console group with full context.
 */

const isDev = import.meta.env.DEV;

function formatMessage(context: string, message: string): string {
  return `[${context}] ${message}`;
}

export const errorLogger = {
  error(context: string, message: string, detail?: unknown) {
    const full = formatMessage(context, message);
    if (isDev) {
      console.group(`🔴 ${full}`);
      if (detail !== undefined) console.error(detail);
      console.groupEnd();
    } else {
      console.error(full, detail ?? '');
      // Forward to Sentry if available
      if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
        try {
          (window as any).__SENTRY__.captureMessage(full, { level: 'error', extra: { detail } });
        } catch {
          // Sentry not loaded — silently skip
        }
      }
    }
  },

  warn(context: string, message: string, detail?: unknown) {
    const full = formatMessage(context, message);
    if (isDev) {
      console.group(`🟡 ${full}`);
      if (detail !== undefined) console.warn(detail);
      console.groupEnd();
    } else {
      console.warn(full, detail ?? '');
    }
  },

  info(context: string, message: string, detail?: unknown) {
    const full = formatMessage(context, message);
    if (isDev) {
      console.info(`🔵 ${full}`, detail ?? '');
    }
    // Info logs are dev-only; not forwarded to Sentry
  }
};
