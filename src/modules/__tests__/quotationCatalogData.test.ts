import { describe, it, expect } from 'vitest';
import {
  getDefaultModulePrices,
  getDefaultPriceFormatted,
  WEBSITE_CATALOG,
  APPLICATION_CATALOG,
  AI_AUTOMATION_CATALOG
} from '../quotationCatalogData';

describe('quotationCatalogData', () => {
  it('returns independent INR and USD default prices for each module group', () => {
    const pages = getDefaultModulePrices('Pages');
    expect(pages).toEqual({ usd: 120, inr: 5000 });

    const features = getDefaultModulePrices('Features');
    expect(features).toEqual({ usd: 280, inr: 12000 });

    const addons = getDefaultModulePrices('Add-ons');
    expect(addons).toEqual({ usd: 450, inr: 22000 });
  });

  it('formats dual prices correctly according to selected currency mode', () => {
    // Pages: inr 5000, usd 120
    expect(getDefaultPriceFormatted('Pages', 'INR')).toBe('₹5,000');
    expect(getDefaultPriceFormatted('Pages', 'USD')).toBe('$120');
    expect(getDefaultPriceFormatted('Pages', 'BOTH')).toBe('₹5,000 / $120');

    // Features: inr 12000, usd 280
    expect(getDefaultPriceFormatted('Features', 'BOTH')).toBe('₹12,000 / $280');
  });

  it('contains expected website subcategories and module lists', () => {
    expect(WEBSITE_CATALOG['Business Website']).toBeDefined();
    expect(WEBSITE_CATALOG['Business Website'].pages).toContain('Home');
    expect(WEBSITE_CATALOG['Business Website'].features).toContain('Responsive Design');
    expect(WEBSITE_CATALOG['Business Website'].addons).toContain('WhatsApp Automation');
  });

  it('contains application and AI automation catalogs', () => {
    expect(APPLICATION_CATALOG['Mobile Application (iOS / Android)']).toBeDefined();
    expect(AI_AUTOMATION_CATALOG['AI Customer Support & Sales Agents']).toBeDefined();
  });
});
