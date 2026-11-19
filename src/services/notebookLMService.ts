import { supabase } from '@/lib/supabase';

const DEFAULT_URL = import.meta.env.VITE_NOTEBOOKLM_CHAT_URL || 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a';
const DEFAULT_DEV_URL = import.meta.env.VITE_DEV_SUPPORT_URL || 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a';
const STORAGE_KEY = 'crm_notebooklm_chat_url';
const DEV_STORAGE_KEY = 'workspace_dev_notebooklm_chat_url';
const POPUP_NAME = 'OOMA_NotebookLM_Companion';
const DEV_POPUP_NAME = 'OOMA_DevSupport_Companion';

export const notebookLMService = {
  getStoredUrl(): string {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  },

  getDevStoredUrl(): string {
    return localStorage.getItem(DEV_STORAGE_KEY) || DEFAULT_DEV_URL;
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

  async fetchDevWorkspaceUrl(workspaceId?: string): Promise<string> {
    try {
      if (workspaceId) {
        const { data, error } = await supabase
          .from('crm_settings')
          .select('value')
          .eq('workspace_id', workspaceId)
          .eq('key', 'dev_notebooklm_chat_url')
          .maybeSingle();

        if (!error && data?.value) {
          localStorage.setItem(DEV_STORAGE_KEY, data.value);
          return data.value;
        }
      }
    } catch {
      // Fallback if table does not exist
    }
    return this.getDevStoredUrl();
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

  async saveDevWorkspaceUrl(url: string, workspaceId?: string): Promise<boolean> {
    const cleanUrl = url.trim();
    if (!cleanUrl) return false;

    // 1. Save locally and broadcast immediate update
    localStorage.setItem(DEV_STORAGE_KEY, cleanUrl);
    window.dispatchEvent(new CustomEvent('workspace-dev-notebooklm-url-changed', { detail: cleanUrl }));

    // 2. Persist to Supabase if workspace exists
    if (workspaceId) {
      try {
        await supabase
          .from('crm_settings')
          .upsert({
            workspace_id: workspaceId,
            key: 'dev_notebooklm_chat_url',
            value: cleanUrl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id,key' });
      } catch (e) {
        console.warn('Could not persist dev_notebooklm_chat_url:', e);
      }
    }
    return true;
  },

  /**
   * One-click launch in exact 390px compact companion window for Sales AI.
   */
  openCompanionWindow(overrideUrl?: string): Window | null {
    return this.launchWindow(overrideUrl || this.getStoredUrl(), POPUP_NAME);
  },

  /**
   * One-click launch in exact 390px compact companion window for Developer Support AI.
   */
  openDevCompanionWindow(overrideUrl?: string): Window | null {
    return this.launchWindow(overrideUrl || this.getDevStoredUrl(), DEV_POPUP_NAME);
  },

  launchWindow(targetUrl: string, windowName: string): Window | null {
    const screenWidth = window.screen.availWidth || 1440;
    const screenHeight = window.screen.availHeight || 900;
    
    // Strict 390px compact width matching chatbot widget
    const targetWidth = 390;
    const targetHeight = Math.min(620, screenHeight - 70);
    // Align with bottom-right position of chatbot widget (24px offset)
    const popupLeft = Math.max(0, screenWidth - targetWidth - 24);
    const popupTop = Math.max(0, screenHeight - targetHeight - 50);

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
      const popup = window.open(targetUrl, windowName, windowFeatures);
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
