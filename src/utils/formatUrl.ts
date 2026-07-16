export function formatUrl(url: string) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Check if it looks like a URL (no spaces/commas, and contains a dot/slash)
  const looksLikeUrl = !/[\s,]+/.test(trimmed) && (trimmed.includes('.') || trimmed.includes('/'));
  if (looksLikeUrl) {
    return `https://${trimmed}`;
  }
  // Otherwise, treat as textual address and construct a search query URL
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}
