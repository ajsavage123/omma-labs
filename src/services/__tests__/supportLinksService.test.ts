import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supportLinksService, DEFAULT_SUPPORT_LINKS } from '../supportLinksService';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe('supportLinksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns default support links when local storage is empty', () => {
    const links = supportLinksService.getStoredLinks();
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].title).toBeDefined();
  });

  it('adds a new support link and saves to local storage', async () => {
    const updated = await supportLinksService.addLink({
      title: 'Custom API Docs',
      category: 'Engineering & Code',
      url: 'https://notebooklm.google.com/notebook/custom-api-docs',
      description: 'API specifications and endpoint references.'
    });

    expect(updated.length).toBe(DEFAULT_SUPPORT_LINKS.length + 1);
    expect(updated[0].title).toBe('Custom API Docs');
    expect(supportLinksService.getStoredLinks()[0].title).toBe('Custom API Docs');
  });

  it('updates an existing link', async () => {
    const current = supportLinksService.getStoredLinks();
    const targetId = current[0].id;

    const updated = await supportLinksService.updateLink(targetId, {
      title: 'Updated Title'
    });

    const target = updated.find(l => l.id === targetId);
    expect(target?.title).toBe('Updated Title');
  });

  it('deletes a link', async () => {
    const current = supportLinksService.getStoredLinks();
    const initialCount = current.length;
    const targetId = current[0].id;

    const updated = await supportLinksService.deleteLink(targetId);
    expect(updated.length).toBe(initialCount - 1);
    expect(updated.find(l => l.id === targetId)).toBeUndefined();
  });

  it('imports links from JSON text', async () => {
    const jsonStr = JSON.stringify([
      { title: 'Imported Link 1', url: 'https://notebooklm.google.com/1', category: 'Engineering & Code' },
      { title: 'Imported Link 2', url: 'https://notebooklm.google.com/2', category: 'Sales & CRM' }
    ]);

    const result = await supportLinksService.importLinksText(jsonStr, undefined, true);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.links.length).toBe(2);
    expect(result.links[0].title).toBe('Imported Link 1');
  });

  it('imports links from CSV text', async () => {
    const csvStr = `CSV Doc 1, https://notebooklm.google.com/csv1, Product & Architecture, Description 1
CSV Doc 2, https://notebooklm.google.com/csv2, Engineering & Code, Description 2`;

    const result = await supportLinksService.importLinksText(csvStr, undefined, true);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.links[0].title).toBe('CSV Doc 1');
  });
});
