import { supabase } from '@/lib/supabase';
import type { Project, ProjectStage, StageName } from '@/types';

export const projectService = {
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_stages (*)
      `)
      .order('created_at', { ascending: false }) as { data: (Project & { project_stages: ProjectStage[] })[] | null, error: any };

    if (error) throw error;
    return data || [];
  },

  async getProjectById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_stages (*)
      `)
      .eq('id', id)
      .single() as { data: (Project & { project_stages: ProjectStage[] }) | null, error: any };

    if (error) throw error;
    return data;
  },

  async createProject(name: string, description: string, driveLink: string, teamMembers: string, userId: string) {
    // 1. Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        drive_link: driveLink,
        team_members: teamMembers,
        created_by: userId,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // 2. Create Initial Stages
    const stages: Partial<ProjectStage>[] = [
      { project_id: project.id, stage_name: 'ideology', status: 'in_progress', started_at: new Date().toISOString() },
      { project_id: project.id, stage_name: 'research', status: 'pending' },
      { project_id: project.id, stage_name: 'development', status: 'pending' },
      { project_id: project.id, stage_name: 'deployment', status: 'pending' },
      { project_id: project.id, stage_name: 'business', status: 'pending' },
      { project_id: project.id, stage_name: 'admin_review', status: 'pending' },
    ];

    const { error: stagesError } = await supabase
      .from('project_stages')
      .insert(stages);

    if (stagesError) throw stagesError;

    // 3. Log Creation
    await this.logActivity(project.id, 'Innovation Team', 'ideology', 'Project created and ideology stage started');

    return project;
  },

  async updateStageStatus(projectId: string, currentStage: StageName, nextStage: StageName | null, _userName: string, designation: string) {
    // 1. Complete current stage
    const { error: currentError } = await supabase
      .from('project_stages')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('stage_name', currentStage);

    if (currentError) throw currentError;

    // 2. Start next stage if exists
    if (nextStage) {
      const { error: nextError } = await supabase
        .from('project_stages')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('stage_name', nextStage);

      if (nextError) throw nextError;
    }

    // 3. Log activity
    await this.logActivity(projectId, designation, currentStage, `Completed ${currentStage} and moved to ${nextStage || 'next phase'}`);
  },

  async updateGithubLink(projectId: string, githubLink: string) {
    const { error } = await supabase
      .from('projects')
      .update({ github_link: githubLink })
      .eq('id', projectId);

    if (error) throw error;
  },

  async logActivity(projectId: string, designation: string, stage: string, updateText: string) {
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch username if not provided
    let userName = 'System';
    if (user) {
      const { data: profile } = await supabase.from('users').select('username').eq('id', user.id).single();
      userName = profile?.username || user.email || 'User';
    }

    await supabase.from('timeline_logs').insert({
      project_id: projectId,
      user_name: userName,
      designation,
      stage,
      update_text: updateText
    });
  },

  async getTimelineLogs(projectId?: string) {
    let query = supabase.from('timeline_logs').select('*').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  }
};
