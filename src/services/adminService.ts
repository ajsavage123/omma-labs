import { supabase } from '@/lib/supabase';
import type { AdminRating, ProjectStatus, Project, ProjectStage, StageName } from '@/types';

export const adminService = {
  async getAdminStats() {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*, project_stages(*)') as { data: (Project & { project_stages: ProjectStage[] })[] | null, error: any };
    if (error) throw error;
    if (!projects) return { activeProjects: 0, researchCount: 0, developmentCount: 0, launchCount: 0, mostActiveTeam: 'None' };

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

    // Shorten team name for stat card display
    if (mostActiveTeam.includes('Innovation')) mostActiveTeam = 'Innovation';
    else if (mostActiveTeam.includes('Developer')) mostActiveTeam = 'Engineering';
    else if (mostActiveTeam.includes('Business')) mostActiveTeam = 'Business';

    return {
      activeProjects: projects.filter((p) => p.status === 'active').length,
      researchCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'research' && s.status === 'in_progress')).length,
      developmentCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'development' && s.status === 'in_progress')).length,
      launchCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'deployment' && s.status === 'in_progress')).length,
      mostActiveTeam,
      adminReviewCount: projects.filter((p) => p.project_stages?.some((s) => s.stage_name === 'admin_review' && s.status === 'in_progress')).length,
    };
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
    const { error: projectError } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId);

    if (projectError) throw projectError;

    if (status === 'active') {
      // Fix: find the last completed stage before admin_review and reset it
      const stageOrder: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'admin_review'];

      const { data: stages } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId) as { data: ProjectStage[] | null };

      if (stages) {
        // Find the most recently completed stage (excluding admin_review)
        const completedStages = stages
          .filter(s => s.stage_name !== 'admin_review' && s.status === 'completed')
          .sort((a, b) => stageOrder.indexOf(b.stage_name) - stageOrder.indexOf(a.stage_name));

        const stageToReset = completedStages[0];

        if (stageToReset) {
          // Reset that stage to in_progress
          await supabase
            .from('project_stages')
            .update({ status: 'in_progress', completed_at: null })
            .eq('project_id', projectId)
            .eq('stage_name', stageToReset.stage_name);
        }

        // Set admin_review back to pending
        await supabase
          .from('project_stages')
          .update({ status: 'pending', started_at: null })
          .eq('project_id', projectId)
          .eq('stage_name', 'admin_review');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    let adminName = 'Admin';
    if (user) {
      const { data: profile } = await supabase.from('users').select('username').eq('id', user.id).single();
      adminName = profile?.username || 'Admin';
    }

    const actionLabel = status === 'completed' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Returned for Improvements';

    await supabase.from('timeline_logs').insert({
      project_id: projectId,
      user_name: adminName,
      designation: 'Admin Dashboard',
      stage: 'admin_review',
      update_text: `${actionLabel}. Admin feedback: ${feedback || 'No additional notes.'}`
    });
  },

  async getProjectRating(projectId: string) {
    const { data, error } = await supabase
      .from('admin_ratings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data as AdminRating | null;
  }
};
