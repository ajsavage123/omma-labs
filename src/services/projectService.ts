import { supabase } from '@/lib/supabase';
import type { Project, ProjectStage, StageName } from '@/types';

export const projectService = {
  async getProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_stages (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getProjects error:', error);
        throw error;
      }
      return (data || []) as (Project & { project_stages: ProjectStage[] })[];
    } catch (err) {
      console.error('projectService.getProjects failed:', err);
      throw err;
    }
  },

  async getProjectById(id: string) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_stages (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase getProjectById error:', error);
        throw error;
      }
      return data as (Project & { project_stages: ProjectStage[] }) | null;
    } catch (err) {
      console.error('projectService.getProjectById failed:', err);
      throw err;
    }
  },

  async createProject(name: string, description: string, driveLink: string, teamMembers: string, userId: string) {
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

    await this.logActivity(project.id, 'Innovation & Research Team', 'ideology', 'Project created – ideology & concept stage started.');

    return project;
  },

  async updateStageStatus(projectId: string, currentStage: StageName, nextStage: StageName | null, _userName: string, designation: string) {
    const { error: currentError } = await supabase
      .from('project_stages')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('stage_name', currentStage);

    if (currentError) throw currentError;

    if (nextStage) {
      const { error: nextError } = await supabase
        .from('project_stages')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('stage_name', nextStage);

      if (nextError) throw nextError;
    }

    const stageLabelMap: Record<string, string> = {
      ideology: 'Ideology & Concept',
      research: 'Research',
      development: 'Development',
      deployment: 'Deployment',
      business: 'Business Strategy & Marketing',
      admin_review: 'Admin Review',
    };

    const nextLabel = nextStage ? stageLabelMap[nextStage] : 'completion';
    await this.logActivity(projectId, designation, currentStage, `Completed ${stageLabelMap[currentStage]} stage and advanced to ${nextLabel}.`);
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
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data;
  }
};
