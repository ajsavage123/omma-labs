export function logError(message: string, error: any) {
  if (import.meta.env && import.meta.env.PROD) {
    // In production, only log the message and the error's message or code to prevent leaking details
    console.error(`${message}:`, error?.message || error?.code || 'An unexpected error occurred');
  } else {
    console.error(message, error);
  }
}
