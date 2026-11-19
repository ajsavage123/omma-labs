import { supabase } from '@/lib/supabase';

export const crmAccessService = {
  async getAccessStatus(userId: string, workspaceId: string) {
    const { data, error } = await supabase
      .from('crm_access')
      .select('status')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching CRM access status:', error);
      return null;
    }
    
    return data?.status || 'none';
  },

  async requestAccess(userId: string, workspaceId: string) {
    const { error } = await supabase
      .from('crm_access')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        status: 'pending',
        requested_at: new Date().toISOString()
      });
    
    if (error) throw error;
  },

  async getPendingRequests(workspaceId: string) {
    const { data, error } = await supabase
      .from('crm_access')
      .select('*, users(username, designation)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data;
  },

  async updateRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('crm_access')
      .update({
        status,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (error) throw error;
  }
};
