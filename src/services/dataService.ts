import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import type { Idea, ClientContact } from '@/types';
import { MOCK_MODE } from '@/lib/mockMode';
import { mockStorage } from '@/utils/mockStorage';

export const dataService = {
  // --- Ideas ---
  async getIdeas(workspaceId: string) {
    if (MOCK_MODE) return mockStorage.getIdeas();

    const cacheKey = `ideas_${workspaceId}`;
    const throttleKey = `last_fetch_${cacheKey}`;
    const now = Date.now();
    
    const lastFetch = Number(localStorage.getItem(throttleKey) || 0);
    const cachedData = queryCache.get<Idea[]>(cacheKey, 60000);
    
    if (cachedData && (now - lastFetch < 2000)) {
      return cachedData;
    }

    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('id, name, drive_link, workspace_id, created_by, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const result = data as Idea[];
      queryCache.set(cacheKey, result);
      localStorage.setItem(throttleKey, Date.now().toString());
      return result;
    } catch (err) {
      console.error('dataService.getIdeas failed:', err);
      return cachedData || [];
    }
  },

  async createIdea(name: string, driveLink: string, workspaceId: string) {
    if (MOCK_MODE) {
      const newIdea: Idea = {
        id: Math.random().toString(36).substring(2, 9),
        name, drive_link: driveLink, workspace_id: workspaceId,
        created_by: 'mock-user-id', created_at: new Date().toISOString()
      };
      mockStorage.addIdea(newIdea);
      return newIdea;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        name,
        drive_link: driveLink,
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    queryCache.invalidate(`ideas_${workspaceId}`);
    return data as Idea;
  },

  async deleteIdea(id: string) {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) throw error;
    // Since we don't have workspaceId here, we clear all ideas cache or wait for TTL
    queryCache.clear(); 
  },

  // --- Client Contacts ---
  async getClientContacts(workspaceId: string) {
    if (MOCK_MODE) return mockStorage.getContacts();

    const cacheKey = `contacts_${workspaceId}`;
    const throttleKey = `last_fetch_${cacheKey}`;
    const now = Date.now();
    
    const lastFetch = Number(localStorage.getItem(throttleKey) || 0);
    const cachedData = queryCache.get<ClientContact[]>(cacheKey, 30000);
    
    if (cachedData && (now - lastFetch < 2000)) {
      return cachedData;
    }

    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('id, name, contact_number, website_link, email, about, status, workspace_id, created_by, created_at')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });

      if (error) throw error;
      const result = data as ClientContact[];
      queryCache.set(cacheKey, result);
      localStorage.setItem(throttleKey, Date.now().toString());
      return result;
    } catch (err) {
      console.error('dataService.getClientContacts failed:', err);
      return cachedData || [];
    }
  },

  async createClientContact(name: string, contactNumber: string, websiteLink: string, email: string, about: string, status: 'online' | 'offline', workspaceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('client_contacts')
      .insert({
        name,
        contact_number: contactNumber,
        website_link: websiteLink,
        email,
        about,
        status,
        workspace_id: workspaceId,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    queryCache.invalidate(`contacts_${workspaceId}`);
    return data as ClientContact;
  },

  async deleteClientContact(id: string) {
    const { error } = await supabase.from('client_contacts').delete().eq('id', id);
    if (error) throw error;
    queryCache.clear();
  },

  // --- Meetings ---
  async getMeetings(workspaceId: string) {
    if (MOCK_MODE) return mockStorage.getMeetings();
    const { data, error } = await supabase.from('meetings').select('*').eq('workspace_id', workspaceId).order('scheduled_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createMeeting(meeting: any) {
    if (MOCK_MODE) {
      const newM = { id: Math.random().toString(36).substring(2, 9), ...meeting, created_at: new Date().toISOString() };
      mockStorage.addMeeting(newM);
      return newM;
    }
    const { data, error } = await supabase.from('meetings').insert(meeting).select().single();
    if (error) throw error;
    return data;
  },

  async deleteMeeting(id: string) {
    if (MOCK_MODE) return mockStorage.deleteMeeting(id);
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Library ---
  async getLibraryDocs(workspaceId: string) {
    if (MOCK_MODE) return mockStorage.getLibraryDocs();
    const { data, error } = await supabase.from('library_docs').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addLibraryDoc(doc: any) {
    if (MOCK_MODE) {
      const newD = { id: Math.random().toString(36).substring(2, 9), ...doc, created_at: new Date().toISOString() };
      mockStorage.addLibraryDoc(newD);
      return newD;
    }
    const { data, error } = await supabase.from('library_docs').insert(doc).select().single();
    if (error) throw error;
    return data;
  },

  async deleteLibraryDoc(id: string) {
    if (MOCK_MODE) return mockStorage.deleteLibraryDoc(id);
    const { error } = await supabase.from('library_docs').delete().eq('id', id);
    if (error) throw error;
  }
};
