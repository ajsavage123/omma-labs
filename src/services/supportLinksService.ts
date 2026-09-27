import { supabase } from '@/lib/supabase';
import { notebookLMService } from '@/services/notebookLMService';
import type { SupportLink } from '@/types';

const STORAGE_KEY = 'workspace_support_links';

export const DEPARTMENTS = [
  { id: 'sales', name: 'Sales & Business', icon: '💼', color: 'from-purple-500/20 to-indigo-500/20' },
  { id: 'engineering', name: 'Engineering & Development', icon: '⚙️', color: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'research', name: 'Research & Innovation Labs', icon: '🔬', color: 'from-emerald-500/20 to-teal-500/20' }
];

export const DEFAULT_SUPPORT_LINKS: SupportLink[] = [
  {
    id: 'default-sales-1',
    title: 'Sales Strategy & Pitch Playbook',
    category: 'Sales & Business',
    url: import.meta.env.VITE_NOTEBOOKLM_CHAT_URL || 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: 'Product pricing, sales scripts, objection handling, and client quotation catalog.',
    icon: 'trending',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-sales-2',
    title: 'CRM Lead Qualification & Pipeline Runbook',
    category: 'Sales & Business',
    url: 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: '7-Day Sales Plan cadence, CRM lead scoring, and pipeline stage advancement checklist.',
    icon: 'briefcase',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-dev-1',
    title: 'Codebase Architecture & API Specs',
    category: 'Engineering & Development',
    url: import.meta.env.VITE_DEV_SUPPORT_URL || 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: 'React TypeScript architecture, Supabase schema definitions, state context, and backend APIs.',
    icon: 'code',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-dev-2',
    title: 'CI/CD, PWA & Deployment Guidelines',
    category: 'Engineering & Development',
    url: 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: 'Vercel build pipelines, Vite configuration, Service Worker push notifications, and testing runbook.',
    icon: 'cpu',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-research-1',
    title: 'Innovation Lab Specs & AI Research Notes',
    category: 'Research & Innovation Labs',
    url: 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: 'Experimental features, AI model integrations, research papers, and concept prototypes.',
    icon: 'sparkles',
    isDefault: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-research-2',
    title: 'System Requirements & Design System',
    category: 'Research & Innovation Labs',
    url: 'https://notebooklm.google.com/notebook/08a636fe-152f-4c16-a7df-098e32411b3a',
    description: 'UI/UX design specs, Figma wireframes, Tailwind design tokens, and client requirement forms.',
    icon: 'layers',
    isDefault: true,
    created_at: new Date().toISOString()
  }
];

export const supportLinksService = {
  /**
   * Synchronously get cached or default support links.
   */
  getStoredLinks(): SupportLink[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local support links:', e);
    }
    return DEFAULT_SUPPORT_LINKS;
  },

  /**
   * Asynchronously fetch support links from Supabase (with localStorage fallback).
   */
  async fetchWorkspaceLinks(workspaceId?: string): Promise<SupportLink[]> {
    try {
      if (workspaceId) {
        const query: any = supabase
          .from('crm_settings')
          .select('value');
        
        const res = await (query.eq ? query.eq('workspace_id', workspaceId).eq('key', 'workspace_support_links') : query);
        const finalRes = res && res.maybeSingle ? await res.maybeSingle() : res;

        if (finalRes && !finalRes.error && finalRes.data?.value !== undefined && finalRes.data?.value !== null) {
          const parsed = JSON.parse(finalRes.data.value);
          if (Array.isArray(parsed)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            return parsed;
          }
        }
      }
    } catch {
      // Quiet fallback if table/mock uninitialized
    }
    return this.getStoredLinks();
  },

  /**
   * Save support links to localStorage and persist to Supabase crm_settings table (Admin only).
   */
  async saveWorkspaceLinks(links: SupportLink[], workspaceId?: string, userRole?: string): Promise<boolean> {
    if (userRole && userRole !== 'admin') {
      console.warn('Unauthorized: Only workspace admins can modify support links.');
      return false;
    }
    try {
      const jsonStr = JSON.stringify(links);
      localStorage.setItem(STORAGE_KEY, jsonStr);
      window.dispatchEvent(new CustomEvent('workspace-support-links-changed', { detail: links }));

      if (workspaceId) {
        await supabase
          .from('crm_settings')
          .upsert({
            workspace_id: workspaceId,
            key: 'workspace_support_links',
            value: jsonStr,
            updated_at: new Date().toISOString()
          }, { onConflict: 'workspace_id,key' });
      }
      return true;
    } catch (e) {
      console.error('Failed to save support links:', e);
      return false;
    }
  },

  /**
   * Add a new custom support link.
   */
  async addLink(
    linkData: Omit<SupportLink, 'id' | 'created_at'>,
    workspaceId?: string,
    userRole?: string
  ): Promise<SupportLink[]> {
    const current = this.getStoredLinks();
    const newLink: SupportLink = {
      ...linkData,
      id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString()
    };
    const updated = [newLink, ...current];
    await this.saveWorkspaceLinks(updated, workspaceId, userRole);
    return updated;
  },

  /**
   * Update an existing custom support link.
   */
  async updateLink(
    id: string,
    updatedData: Partial<SupportLink>,
    workspaceId?: string,
    userRole?: string
  ): Promise<SupportLink[]> {
    const current = this.getStoredLinks();
    const updated = current.map(item => item.id === id ? { ...item, ...updatedData } : item);
    await this.saveWorkspaceLinks(updated, workspaceId, userRole);
    return updated;
  },

  /**
   * Delete a support link by ID.
   */
  async deleteLink(id: string, workspaceId?: string, userRole?: string): Promise<SupportLink[]> {
    const current = this.getStoredLinks();
    const updated = current.filter(item => item.id !== id);
    await this.saveWorkspaceLinks(updated, workspaceId, userRole);
    return updated;
  },

  /**
   * Reset support links to default system topics.
   */
  async resetToDefaults(workspaceId?: string, userRole?: string): Promise<SupportLink[]> {
    await this.saveWorkspaceLinks(DEFAULT_SUPPORT_LINKS, workspaceId, userRole);
    return DEFAULT_SUPPORT_LINKS;
  },

  /**
   * Bulk import links from raw JSON or CSV text.
   */
  async importLinksText(
    text: string,
    workspaceId?: string,
    replaceExisting = false,
    userRole?: string
  ): Promise<{ success: boolean; count: number; links: SupportLink[]; error?: string }> {
    const cleanText = text.trim();
    if (!cleanText) {
      return { success: false, count: 0, links: this.getStoredLinks(), error: 'Import text is empty.' };
    }

    let parsedLinks: SupportLink[] = [];

    try {
      if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
        const rawJson = cleanText.startsWith('{') ? `[${cleanText}]` : cleanText;
        const items = JSON.parse(rawJson);
        if (Array.isArray(items)) {
          parsedLinks = items.map((item: any) => ({
            id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: item.title || item.name || 'Untitled Document',
            category: item.category || 'General Technical',
            url: item.url || item.link || 'https://notebooklm.google.com/',
            description: item.description || item.desc || '',
            icon: item.icon || 'book',
            created_at: new Date().toISOString()
          })).filter(l => l.title && l.url.startsWith('http'));
        }
      } else {
        const lines = cleanText.split('\n');
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 2 && parts[1].startsWith('http')) {
            parsedLinks.push({
              id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: parts[0] || 'Untitled Support Link',
              url: parts[1],
              category: parts[2] || 'Engineering & Code',
              description: parts[3] || '',
              icon: 'file',
              created_at: new Date().toISOString()
            });
          }
        }
      }

      if (parsedLinks.length === 0) {
        return {
          success: false,
          count: 0,
          links: this.getStoredLinks(),
          error: 'No valid URLs found in import data. Ensure links start with http:// or https://'
        };
      }

      const current = replaceExisting ? [] : this.getStoredLinks();
      const merged = [...parsedLinks, ...current];
      await this.saveWorkspaceLinks(merged, workspaceId, userRole);

      return {
        success: true,
        count: parsedLinks.length,
        links: merged
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        links: this.getStoredLinks(),
        error: `Failed to parse import data: ${err.message || err}`
      };
    }
  },

  /**
   * Export all current links as a formatted JSON string.
   */
  exportLinksJSON(): string {
    const links = this.getStoredLinks();
    return JSON.stringify(links, null, 2);
  },

  /**
   * Launch a specific support companion window for a given topic link.
   */
  launchSupportCompanion(url: string, title?: string): Window | null {
    const cleanTitle = (title || 'General_Support').replace(/[^a-zA-Z0-9]/g, '_');
    const targetWindowName = `OOMA_Support_Companion_${cleanTitle}`;
    return notebookLMService.launchWindow(url, targetWindowName);
  }
};
