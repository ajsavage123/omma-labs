import { supabase } from '@/lib/supabase';
import type { AdminRating, ProjectStatus, Project, ProjectStage } from '@/types';

export const adminService = {
  async getAdminStats() {
    const { data: projects, error } = await supabase.from('projects').select('*, project_stages(*)') as { data: (Project & { project_stages: ProjectStage[] })[] | null, error: any };
    if (error) throw error;
    if (!projects) return { activeProjects: 0, researchCount: 0, developmentCount: 0, launchCount: 0 };

    // Calculate most active team from logs
    const { data: logs } = await supabase.from('timeline_logs').select('designation');
    const teamCounts: Record<string, number> = {};
    logs?.forEach(log => {
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
  }
};
