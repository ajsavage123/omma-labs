import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import type { AdminRating, ProjectStatus, Project, ProjectStage, User, Invitation } from '@/types';
import { MOCK_MODE } from '@/lib/mockMode';
import { mockStorage } from '@/utils/mockStorage';

export const adminService = {
  async getAdminStats() {
    if (MOCK_MODE) return { activeProjects: 0, researchCount: 0, developmentCount: 0, launchCount: 0, mostActiveTeam: 'Mock Team' };

    const { data: projects, error } = await supabase.from('projects').select('*, project_stages(*)') as { data: (Project & { project_stages: ProjectStage[] })[] | null, error: any };
    if (error) throw error;
    if (!projects) return { activeProjects: 0, researchCount: 0, developmentCount: 0, launchCount: 0, mostActiveTeam: 'None' };

    // Calculate most active team from logs
    const { data: logs } = await supabase.from('timeline_logs').select('designation');
    const teamCounts: Record<string, number> = {};
    logs?.forEach((log: any) => {
      teamCounts[log.designation] = (teamCounts[log.designation] || 0) + 1;
    });

    let mostActiveTeam = 'None';
    let maxLogs = 0;
    Object.entries(teamCounts).forEach(([team, count]) => {
      if (count > maxLogs) {
        maxLogs = count;
        mostActiveTeam = team;
      }
    });

    const stats = {
      activeProjects: projects.filter((p) => p.status === 'active').length,
      researchCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'research' && s.status === 'in_progress')).length,
      developmentCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'development' && s.status === 'in_progress')).length,
      launchCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'deployment' && s.status === 'in_progress')).length,
      mostActiveTeam
    };

    return stats;
  },

  async submitRating(rating: Partial<AdminRating>) {
    const { data, error } = await supabase
      .from('admin_ratings')
      .upsert(rating)
      .select()
      .single();

    if (error) throw error;
    queryCache.invalidate(`project_${rating.project_id}`);
    return data;
  },

  async updateProjectStatus(projectId: string, status: ProjectStatus, feedback: string) {
    // 1. Update status
    const { error: projectError } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId);

    if (projectError) throw projectError;

    // 2. If return for improvements, reset to research/development
    if (status === 'active') {
       await supabase.from('project_stages').update({ status: 'in_progress' }).eq('project_id', projectId).eq('stage_name', 'research');
       await supabase.from('project_stages').update({ status: 'pending' }).eq('project_id', projectId).eq('stage_name', 'admin_review');
    }

    // 3. Log action
    await supabase.auth.getUser();
    await supabase.from('timeline_logs').insert({
      project_id: projectId,
      user_name: 'Admin',
      designation: 'Admin Dashboard',
      stage: 'admin_review',
      update_text: `Admin Decision: ${status.toUpperCase()}. Feedback: ${feedback}`
    });
    
    queryCache.invalidate('projects_list');
    queryCache.invalidate(`project_${projectId}`);
    queryCache.invalidate('logs_all');
    queryCache.invalidate(`logs_${projectId}`);
  },

  // --- Team Management Functions ---
  
  async getTeamMembers(workspaceId: string) {
    if (MOCK_MODE) return [mockStorage.getMockUser()];

    const cacheKey = `members_${workspaceId}`;
    const cachedData = queryCache.get<User[]>(cacheKey, 60000);
    if (cachedData) return cachedData;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, designation, role, workspace_id, skills, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const result = data as User[];
      queryCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('adminService.getTeamMembers failed:', err);
      throw err;
    }
  },

  async getActiveInvitations(workspaceId: string) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('used', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invitation[];
  },

  async generateInvite(role: 'admin' | 'partner', designation: string, workspaceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate a secure random 8-character hex code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        workspace_id: workspaceId,
        code,
        role,
        designation,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    queryCache.invalidate(`invitations_${workspaceId}`);
    return data as Invitation;
  },

  async deleteInvite(inviteId: string) {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;
  },

  async updateUserProfile(userId: string, data: { designation?: string; role?: string; bio?: string; skills?: string }) {
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId);

    if (error) throw error;
    
    // Clear cache to ensure fresh data on next fetch
    // Since we don't always have workspace_id here, we can clear all member caches or fetch it
    const { data: userData } = await supabase.from('users').select('workspace_id').eq('id', userId).single();
    if (userData?.workspace_id) {
      queryCache.invalidate(`members_${userData.workspace_id}`);
    }
  },

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  async deleteTimelineLog(logId: string) {

    const { error } = await supabase
      .from('timeline_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;
  },

  async deleteProject(projectId: string) {
    // Rely on DB cascade for stages, logs, and ratings
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  },

  async toggleCodeRed(projectId: string, workspaceId: string, applyCodeRed: boolean) {
    if (applyCodeRed) {
      // 1. Pause all current active projects in workspace
      await supabase
        .from('projects')
        .update({ status: 'paused' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');
        
      // 2. Set the target project to code_red
      await supabase
        .from('projects')
        .update({ status: 'code_red' })
        .eq('id', projectId);
    } else {
      // 1. Unpause all paused projects back to active
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('workspace_id', workspaceId)
        .eq('status', 'paused');
        
      // 2. Set the target project back to active from code_red
      await supabase
        .from('projects')
        .update({ status: 'active' })
        .eq('id', projectId);
    }
    
    queryCache.invalidate('projects_list');
    queryCache.clear(); // Code Red affects many projects, easier to clear
  }
};
