import { supabase } from '@/lib/supabase';

const DEFAULT_URL = import.meta.env.VITE_NOTEBOOKLM_CHAT_URL || 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a';
const STORAGE_KEY = 'crm_notebooklm_chat_url';
const POPUP_NAME = 'OOMA_NotebookLM_Companion';

export const notebookLMService = {
  getStoredUrl(): string {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  },

  async fetchWorkspaceUrl(workspaceId?: string): Promise<string> {
    try {
      if (workspaceId) {
        const { data, error } = await supabase
          .from('crm_settings')
          .select('value')
          .eq('workspace_id', workspaceId)
          .eq('key', 'notebooklm_chat_url')
          .maybeSingle();

        if (!error && data?.value) {
          localStorage.setItem(STORAGE_KEY, data.value);
          return data.value;
        }
      }
    } catch {
      // Fallback if table does not exist
    }
    return this.getStoredUrl();
  },

  async saveWorkspaceUrl(url: string, workspaceId?: string): Promise<boolean> {
    const cleanUrl = url.trim();
    if (!cleanUrl) return false;

    // 1. Save locally and broadcast immediate update
    localStorage.setItem(STORAGE_KEY, cleanUrl);
    window.dispatchEvent(new CustomEvent('crm-notebooklm-url-changed', { detail: cleanUrl }));

    // 2. Persist to Supabase if workspace exists
    if (workspaceId) {
      try {
        await supabase
          .from('crm_settings')
          .upsert({
            workspace_id: workspaceId,
            key: 'notebooklm_chat_url',
            value: cleanUrl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id,key' });
      } catch (e) {
        console.warn('Could not persist to crm_settings table (falling back to workspace state):', e);
      }
    }
    return true;
  },

  /**
   * One-click launch in exact 390px compact companion window.
   * Named window target 'OOMA_NotebookLM_Companion' ensures repeated clicks
   * bring the existing window to focus instead of opening duplicate windows.
   */
  openCompanionWindow(overrideUrl?: string): Window | null {
    const targetUrl = overrideUrl || this.getStoredUrl();
    const screenWidth = window.screen.availWidth || 1440;
    const screenHeight = window.screen.availHeight || 900;
    
    // Strict 390px compact width
    const targetWidth = 390;
    const targetHeight = Math.min(580, screenHeight - 90);
    const popupLeft = Math.max(0, screenWidth - targetWidth - 20);
    const popupTop = 30;

    const windowFeatures = [
      `width=${targetWidth}`,
      `height=${targetHeight}`,
      `left=${popupLeft}`,
      `top=${popupTop}`,
      'resizable=yes',
      'scrollbars=yes',
      'status=no',
      'toolbar=no',
      'menubar=no',
      'location=yes'
    ].join(',');

    try {
      const popup = window.open(targetUrl, POPUP_NAME, windowFeatures);
      if (popup && !popup.closed) {
        try {
          popup.focus();
        } catch {
          // ignore focus error
        }
      }
      return popup;
    } catch {
      return null;
    }
  }
};
