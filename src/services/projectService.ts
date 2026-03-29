import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import type { Project, ProjectStage, StageName, TimelineLog } from '@/types';
import { MOCK_MODE } from '@/lib/mockMode';
import { mockStorage } from '@/utils/mockStorage';

const filterValidStages = (project: Project & { project_stages: ProjectStage[] }) => {
  if (!project || !project.project_stages) return project;
  const validStages = project.project_type === 'client' 
     ? ['discovery', 'proposals_contracts', 'ui_ux_design', 'client_approval', 'development', 'qa_testing', 'client_uat', 'deployment', 'maintenance_support', 'admin_review']
     : ['ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'];
  project.project_stages = project.project_stages.filter(s => validStages.includes(s.stage_name as string));
  return project;
};

export const projectService = {
  async getProjects() {
    if (MOCK_MODE) return mockStorage.getProjects();

    const cacheKey = 'projects_list';
    const throttleKey = 'last_fetch_projects';
    const now = Date.now();
    
    // 1. Cross-tab throttle: If any tab fetched in the last 2 seconds, use cache
    const lastFetch = Number(localStorage.getItem(throttleKey) || 0);
    const cachedData = queryCache.get<(Project & { project_stages: ProjectStage[] })[]>(cacheKey, 30000);
    
    if (cachedData && (now - lastFetch < 2000)) {
      return cachedData;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, description, project_type, created_at, deadline, 
          client_name, team_members, workspace_id, drive_link, github_link,
          project_stages (id, stage_name, status, started_at, completed_at, workspace_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const result = (data || []) as (Project & { project_stages: ProjectStage[] })[];
      result.forEach(p => filterValidStages(p));
      queryCache.set(cacheKey, result);
      localStorage.setItem(throttleKey, Date.now().toString());
      return result;
    } catch (err) {
      console.error('projectService.getProjects failed:', err);
      // Fallback to stale cache if network fails (egress limit)
      return cachedData || [];
    }
  },

  async getProjectById(id: string) {
    if (MOCK_MODE) return mockStorage.getProjects().find(p => p.id === id) || null;

    const cacheKey = `project_${id}`;
    const cachedData = queryCache.get<(Project & { project_stages: ProjectStage[] })>(cacheKey, 30000);
    if (cachedData) return cachedData;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, description, project_type, created_at, deadline, 
          client_name, client_phone, team_members, workspace_id, drive_link, github_link,
          project_stages (id, stage_name, status, started_at, completed_at, workspace_id),
          admin_ratings (id, innovation_score, notes)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase getProjectById error:', error);
        throw error;
      }
      
      const result = data as (Project & { project_stages: ProjectStage[] }) | null;
      if (result) {
        filterValidStages(result);
        queryCache.set(cacheKey, result);
      }
      return result;
    } catch (err) {
      console.error('projectService.getProjectById failed:', err);
      throw err;
    }
  },

  async createProject(name: string, description: string, driveLink: string, githubLink: string | null, teamMembers: string, userId: string, workspaceId: string, projectType: 'internal' | 'client' = 'internal', deadline: string | null = null, clientName: string | null = null, clientPhone: string | null = null) {
    if (MOCK_MODE) {
      const newProject: Project = {
        id: Math.random().toString(36).substring(2, 9),
        name, description, drive_link: driveLink, github_link: githubLink || undefined,
        team_members: teamMembers, created_by: userId, workspace_id: workspaceId,
        project_type: projectType, deadline: deadline || undefined,
        client_name: clientName || undefined, client_phone: clientPhone || undefined,
        status: 'active', created_at: new Date().toISOString()
      };
      
      const stages: ProjectStage[] = (projectType === 'client' ? [
        'discovery', 'proposals_contracts', 'ui_ux_design', 'client_approval', 'development', 'qa_testing', 'client_uat', 'deployment', 'maintenance_support'
      ] : [
        'ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'
      ]).map((s, i) => ({
        id: Math.random().toString(36).substring(2, 9),
        project_id: newProject.id, workspace_id: workspaceId,
        stage_name: s as StageName, assigned_team: 'Team ' + i,
        status: i === 0 ? 'in_progress' : 'pending',
        started_at: i === 0 ? new Date().toISOString() : null,
        completed_at: null
      }));

      mockStorage.saveProject(newProject, stages);
      return newProject;
    }

    // 1. Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        project_type: projectType,
        description,
        deadline,
        client_name: clientName,
        client_phone: clientPhone,
        drive_link: driveLink,
        github_link: githubLink,
        team_members: teamMembers,
        created_by: userId,
        workspace_id: workspaceId,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // 2. Create Initial Stages according to project type
    const internalStages: Partial<ProjectStage>[] = [
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'ideology', status: 'in_progress', started_at: new Date().toISOString() },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'research', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'development', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'deployment', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'business', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'marketing', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'admin_review', status: 'pending' }
    ];

    const clientStages: Partial<ProjectStage>[] = [
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'discovery', status: 'in_progress', started_at: new Date().toISOString() },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'proposals_contracts', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'ui_ux_design', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'client_approval', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'development', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'qa_testing', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'client_uat', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'deployment', status: 'pending' },
      { project_id: project.id, workspace_id: workspaceId, stage_name: 'maintenance_support', status: 'pending' }
    ];

    const stages = projectType === 'client' ? clientStages : internalStages;

    // IMPORTANT FIX: In case the live database has a hidden 'AFTER INSERT' trigger auto-generating legacy internal stages, 
    // we must fiercely delete them here first before injecting our optimized dual-track arrays!
    await supabase.from('project_stages').delete().eq('project_id', project.id);

    const { error: stagesError } = await supabase
      .from('project_stages')
      .insert(stages);

    if (stagesError && stagesError.code !== '23505') {
      console.error('Error inserting project stages:', stagesError);
      throw stagesError;
    } else if (stagesError?.code === '23505') {
      console.warn('Stages already exist for this project, continuing safely.');
    }

    // 3. Log Activity
    const initialStage = projectType === 'client' ? 'discovery' : 'ideology';
    const logText = projectType === 'client' ? 'Client Solutions project initialized – discovery stage started.' : 'Internal Venture initialized – ideology & concept stage started.';
    const logDesignation = projectType === 'client' ? 'Client Success & Accounts Team' : 'Innovation & Research Team';
    await this.logActivity(project.id, logDesignation, initialStage, logText, workspaceId);

    queryCache.invalidate('projects_list');
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
      ui_ux_design: 'Product Design (UI/UX)',
      development: 'Development',
      qa_testing: 'QA & Testing',
      deployment: 'Deployment',
      marketing: 'Marketing',
      admin_review: 'Admin Review',
      discovery: 'Client Discovery',
      proposals_contracts: 'Contracts & Proposals',
      client_approval: 'Client Design Approval',
      client_uat: 'Client UAT Testing',
      maintenance_support: 'Maintenance Retainer'
    };

    const nextLabel = nextStage ? stageLabelMap[nextStage] : 'completion';
    await this.logActivity(projectId, designation, currentStage, `Completed ${stageLabelMap[currentStage]} stage and advanced to ${nextLabel}.`, workspaceId);
    queryCache.invalidate('projects_list');
    queryCache.invalidate(`project_${projectId}`);
  },

  async sendBackToStage(projectId: string, workspaceId: string, targetStage: StageName, feedbackNote: string, projectType: 'internal' | 'client') {
    // Full ordered pipeline for each track
    const order: StageName[] = projectType === 'client'
      ? ['discovery', 'proposals_contracts', 'ui_ux_design', 'client_approval', 'development', 'qa_testing', 'client_uat', 'deployment', 'maintenance_support', 'admin_review']
      : ['ideology', 'research', 'business', 'marketing', 'admin_review'];

    const targetIndex = order.indexOf(targetStage);
    if (targetIndex === -1) throw new Error(`Stage "${targetStage}" not found in pipeline.`);

    // Stages after the target (including admin_review) go back to pending
    const stagesToReset = order.slice(targetIndex + 1);

    // 1. Set the target stage to in_progress
    const { error: e1 } = await supabase
      .from('project_stages')
      .update({ status: 'in_progress', started_at: new Date().toISOString(), completed_at: null })
      .eq('project_id', projectId)
      .eq('stage_name', targetStage);
    if (e1) throw e1;

    // 2. Reset all downstream stages (including admin_review) to pending
    if (stagesToReset.length > 0) {
      const { error: e2 } = await supabase
        .from('project_stages')
        .update({ status: 'pending', started_at: null, completed_at: null })
        .eq('project_id', projectId)
        .in('stage_name', stagesToReset);
      if (e2) throw e2;
    }

    // 3. Set project status back to active
    const { error: e3 } = await supabase
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId);
    if (e3) throw e3;

    // 4. Log with admin feedback so team sees WHY they were sent back
    const stageLabelMap: Record<string, string> = {
      ideology: 'Ideology & Concept', research: 'Research', business: 'Business Strategy',
      marketing: 'Marketing', discovery: 'Client Discovery', proposals_contracts: 'Contracts & Proposals',
      ui_ux_design: 'UI/UX Design', client_approval: 'Client Approval', development: 'Development',
      qa_testing: 'QA & Testing', client_uat: 'Client UAT', deployment: 'Deployment',
      maintenance_support: 'Maintenance & Retainer',
    };
    const stageLabel = stageLabelMap[targetStage] || targetStage;
    await this.logActivity(
      projectId, 'Admin', targetStage,
      `⚠️ Admin sent project back to "${stageLabel}" stage. Feedback: ${feedbackNote || 'Please review and redo this stage.'}`,
      workspaceId
    );

    queryCache.invalidate('projects_list');
    queryCache.invalidate(`project_${projectId}`);
  },

  async updateGithubLink(projectId: string, githubLink: string) {
    const { error } = await supabase
      .from('projects')
      .update({ github_link: githubLink })
      .eq('id', projectId);

    if (error) throw error;
    queryCache.invalidate(`project_${projectId}`);
    queryCache.invalidate('projects_list');
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) throw error;
    queryCache.invalidate(`project_${projectId}`);
    queryCache.invalidate('projects_list');
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

    queryCache.invalidate('logs_all');
    queryCache.invalidate(`logs_${projectId}`);
  },

  async getTimelineLogs(projectId?: string) {
    if (MOCK_MODE) return mockStorage.getLogs(projectId);

    const cacheKey = projectId ? `logs_${projectId}` : 'logs_all';
    const throttleKey = `last_fetch_${cacheKey}`;
    const now = Date.now();

    const lastFetch = Number(localStorage.getItem(throttleKey) || 0);
    const cachedData = queryCache.get<TimelineLog[]>(cacheKey, 15000);
    
    if (cachedData && (now - lastFetch < 2000)) {
      return cachedData;
    }

    let query = supabase.from('timeline_logs')
      .select('id, project_id, user_name, designation, stage, update_text, created_at, projects(name)')
      .order('created_at', { ascending: false });
      
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query.limit(50);
    if (error) throw error;
    
    const result = data as any[] as TimelineLog[];
    queryCache.set(cacheKey, result);
    localStorage.setItem(throttleKey, Date.now().toString());
    return result;
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
