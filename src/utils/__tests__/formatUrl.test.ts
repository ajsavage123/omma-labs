import { describe, it, expect } from 'vitest';

/**
 * The formatUrl function is currently duplicated in CRMLeads.tsx and CRMPipeline.tsx.
 * We test the logic inline here, and will extract to a shared module later.
 */
function formatUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const looksLikeUrl = !/[\s,]+/.test(trimmed) && (trimmed.includes('.') || trimmed.includes('/'));
  if (looksLikeUrl) {
    return `https://${trimmed}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

describe('formatUrl', () => {
  it('returns empty string for empty input', () => {
    expect(formatUrl('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    // @ts-ignore — testing null guard
    expect(formatUrl(null as any)).toBe('');
    // @ts-ignore
    expect(formatUrl(undefined as any)).toBe('');
  });

  it('preserves URLs that already have https://', () => {
    expect(formatUrl('https://example.com')).toBe('https://example.com');
    expect(formatUrl('https://www.google.com/maps')).toBe('https://www.google.com/maps');
  });

  it('preserves URLs that already have http://', () => {
    expect(formatUrl('http://example.com')).toBe('http://example.com');
  });

  it('is case-insensitive for protocol detection', () => {
    expect(formatUrl('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
    expect(formatUrl('Http://Example.com')).toBe('Http://Example.com');
  });

  it('prepends https:// for bare domains with dots', () => {
    expect(formatUrl('example.com')).toBe('https://example.com');
    expect(formatUrl('www.google.com')).toBe('https://www.google.com');
  });

  it('prepends https:// for paths with slashes', () => {
    expect(formatUrl('example.com/path/to/page')).toBe('https://example.com/path/to/page');
  });

  it('trims whitespace before processing', () => {
    expect(formatUrl('  https://example.com  ')).toBe('https://example.com');
    expect(formatUrl('  example.com  ')).toBe('https://example.com');
  });

  it('converts text addresses to Google Maps search URL', () => {
    const result = formatUrl('123 Main St, City');
    expect(result).toContain('google.com/maps/search');
    expect(result).toContain(encodeURIComponent('123 Main St, City'));
  });

  it('converts address without commas/dots to Google Maps search URL', () => {
    const result = formatUrl('Near Indiranagar Metro Station');
    expect(result).toContain('google.com/maps/search');
    expect(result).toContain(encodeURIComponent('Near Indiranagar Metro Station'));
  });

  it('handles IP-like addresses with dots as URLs', () => {
    expect(formatUrl('192.168.1.1')).toBe('https://192.168.1.1');
  });
});
