import { supabase } from '@/lib/supabase';
import type { Idea, ClientContact } from '@/types';

export const dataService = {
  // --- Ideas ---
  async getIdeas(workspaceId: string) {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Idea[];
  },

  async createIdea(name: string, driveLink: string, workspaceId: string) {
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
    return data as Idea;
  },

  async deleteIdea(id: string) {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Client Contacts ---
  async getClientContacts(workspaceId: string) {
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClientContact[];
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
    return data as ClientContact;
  },

  async deleteClientContact(id: string) {
    const { error } = await supabase.from('client_contacts').delete().eq('id', id);
    if (error) throw error;
  }
};
