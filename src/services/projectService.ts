import { supabase } from '@/lib/supabase';
import type { Project, ProjectStage, StageName } from '@/types';

export const projectService = {
  async getProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_stages (*),
          admin_ratings (*)
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
          project_stages (*),
          admin_ratings (*)
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

  async createProject(name: string, description: string, driveLink: string, teamMembers: string, userId: string, workspaceId: string, deadline: string | null = null, clientName: string | null = null, clientPhone: string | null = null) {
    // 1. Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        deadline,
        client_name: clientName,
        client_phone: clientPhone,
        drive_link: driveLink,
        team_members: teamMembers,
        created_by: userId,
        workspace_id: workspaceId,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // 2. Create Initial Stages
    const stages: Partial<ProjectStage>[] = [
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'ideology', status: 'in_progress', started_at: new Date().toISOString() },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'research', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'development', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'deployment', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'business', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'marketing', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'admin_review', status: 'pending' },
    ];

    const { error: stagesError } = await supabase
      .from('project_stages')
      .insert(stages);

    if (stagesError) {
      console.error('Error inserting project stages:', stagesError);
      throw stagesError;
    }

    // 3. Log Activity
    await this.logActivity(project.id, 'Innovation & Research Team', 'ideology', 'Project created – ideology & concept stage started.', workspaceId);

    return project;
  },

  async updateStageStatus(projectId: string, workspaceId: string, currentStage: StageName, nextStage: StageName | null, _userName: string, designation: string) {
    // 1. Mark current stage as completed
    const { data: currentData, error: currentError } = await supabase
      .from('project_stages')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('stage_name', currentStage)
      .select();

    if (currentError) throw currentError;
    if (!currentData || currentData.length === 0) {
      throw new Error(`Failed to update current stage "${currentStage}". Row not found or no change made.`);
    }

    // 2. Mark next stage as in_progress
    if (nextStage) {
      const { data: nextData, error: nextError } = await supabase
        .from('project_stages')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('stage_name', nextStage)
        .select();

      if (nextError) throw nextError;
      if (!nextData || nextData.length === 0) {
        console.warn(`Next stage "${nextStage}" not found in database for project ${projectId}`);
      }
    }

    // 3. Log activity after successful database updates
    const stageLabelMap: Record<string, string> = {
      ideology: 'Ideology & Concept',
      research: 'Research',
      development: 'Development',
      deployment: 'Deployment',
      business: 'Business Strategy',
      marketing: 'Marketing',
      admin_review: 'Admin Review',
    };

    const nextLabel = nextStage ? stageLabelMap[nextStage] : 'completion';
    await this.logActivity(projectId, designation, currentStage, `Completed ${stageLabelMap[currentStage]} stage and advanced to ${nextLabel}.`, workspaceId);
  },

  async updateGithubLink(projectId: string, githubLink: string) {
    const { error } = await supabase
      .from('projects')
      .update({ github_link: githubLink })
      .eq('id', projectId);

    if (error) throw error;
  },

  async logActivity(projectId: string, designation: string, stage: string, updateText: string, workspaceId: string) {
    const { data: { user } } = await supabase.auth.getUser();

    let userName = 'System';
    if (user) {
      const { data: profile } = await supabase.from('users').select('username, full_name').eq('id', user.id).single();
      userName = profile?.full_name || profile?.username || 'User';
    }

    await supabase.from('timeline_logs').insert({
      project_id: projectId,
      workspace_id: workspaceId,
      user_name: userName,
      designation,
      stage,
      update_text: updateText
    });
  },

  async getTimelineLogs(projectId?: string) {
    let query = supabase.from('timeline_logs').select('*, projects(name)').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data;
  },

  async cleanupOldMessages() {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', fiveDaysAgo.toISOString());
      
    if (error) {
      console.error('Cleanup old messages failed:', error);
    }
  }
};
