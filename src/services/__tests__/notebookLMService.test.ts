import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notebookLMService } from '../notebookLMService';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { value: 'https://notebooklm.google.com/notebook/workspace-test' },
              error: null,
            }),
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe('notebookLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('retrieves default or stored URL', () => {
    const defaultUrl = notebookLMService.getStoredUrl();
    expect(defaultUrl).toContain('notebooklm.google.com');

    localStorage.setItem('crm_notebooklm_chat_url', 'https://notebooklm.google.com/notebook/custom-123');
    expect(notebookLMService.getStoredUrl()).toBe('https://notebooklm.google.com/notebook/custom-123');
  });

  it('saves workspace URL to localStorage and broadcasts event', async () => {
    const listener = vi.fn();
    window.addEventListener('crm-notebooklm-url-changed', listener);

    const success = await notebookLMService.saveWorkspaceUrl('https://notebooklm.google.com/notebook/new-url', 'ws-test');
    expect(success).toBe(true);
    expect(localStorage.getItem('crm_notebooklm_chat_url')).toBe('https://notebooklm.google.com/notebook/new-url');
    expect(listener).toHaveBeenCalled();

    window.removeEventListener('crm-notebooklm-url-changed', listener);
  });

  it('opens companion window with 390px width and OOMA_NotebookLM_Companion target', () => {
    const mockFocus = vi.fn();
    const mockWindowOpen = vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      focus: mockFocus,
    } as unknown as Window);

    const popup = notebookLMService.openCompanionWindow('https://notebooklm.google.com/notebook/test');
    expect(popup).not.toBeNull();
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://notebooklm.google.com/notebook/test',
      'OOMA_NotebookLM_Companion',
      expect.stringContaining('width=390')
    );
    expect(mockFocus).toHaveBeenCalled();
  });
});
